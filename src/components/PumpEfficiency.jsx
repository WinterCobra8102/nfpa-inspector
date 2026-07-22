import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "../supabaseClient";
import {
  Activity,
  Droplets,
  TrendingUp,
  Calculator,
  ShieldCheck,
  Gauge,
  CheckCircle2,
  Save,
  FileText,
  X,
  History,
  Info,
  Clock,
  Trash2,
  AlertTriangle,
  Download // <-- Agregado Download
} from "lucide-react";
import toast from "react-hot-toast";

export default function PumpEfficiency() {
  const [ratedGPM, setRatedGPM] = useState("");
  const [ratedPSI, setRatedPSI] = useState("");
  const [churnSuction, setChurnSuction] = useState("");
  const [churnDischarge, setChurnDischarge] = useState("");
  const [ratedSuction, setRatedSuction] = useState("");
  const [ratedDischarge, setRatedDischarge] = useState("");

  const [testName, setTestName] = useState("");
  const [explanationText, setExplanationText] = useState("");
  const [savedTests, setSavedTests] = useState([]);
  const [currentViewId, setCurrentViewId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // ESTADOS PARA EL MODAL DE CONFIRMACIÓN DE BORRADO
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [testToDelete, setTestToDelete] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from("pump_tests")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setSavedTests(data);
  };

  const mathData = useMemo(() => {
    const isComplete =
      ratedGPM !== "" &&
      ratedPSI !== "" &&
      churnSuction !== "" &&
      churnDischarge !== "" &&
      ratedSuction !== "" &&
      ratedDischarge !== "";

    if (!isComplete) return { valid: false };

    const rGPM = Number(ratedGPM);
    const rPSI = Number(ratedPSI);

    if (rGPM <= 0) return { valid: false };

    const cNet = Number(churnDischarge) - Number(churnSuction);
    const actRatedNet = Number(ratedDischarge) - Number(ratedSuction);

    const k = (cNet - actRatedNet) / (rGPM * rGPM);
    const gpm150 = rGPM * 1.5;
    const predicted150Net = cNet - k * (gpm150 * gpm150);
    const min150NFPA = rPSI * 0.65;

    return {
      valid: true,
      cNet,
      actRatedNet,
      gpm150,
      predicted150Net,
      min150NFPA,
      isPassing: predicted150Net >= min150NFPA,
      k,
      rGPM,
      rPSI,
    };
  }, [
    ratedGPM,
    ratedPSI,
    churnSuction,
    churnDischarge,
    ratedSuction,
    ratedDischarge,
  ]);

  const chartData = useMemo(() => {
    if (!mathData.valid) return null;

    const {
      rGPM,
      rPSI,
      cNet,
      actRatedNet,
      gpm150,
      predicted150Net,
      min150NFPA,
      k,
    } = mathData;

    const w = 800;
    const h = 400;
    const maxGPM = gpm150 * 1.15;
    const maxPSI = Math.max(cNet, rPSI) * 1.2;

    let path = "";
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const curGPM = (maxGPM / steps) * i;
      const curPSI = Math.max(0, cNet - k * (curGPM * curGPM));
      const x = (curGPM / maxGPM) * w;
      const y = h - (curPSI / maxPSI) * h;
      path += `${i === 0 ? "M" : "L"} ${x},${y} `;
    }

    return {
      w,
      h,
      maxGPM,
      maxPSI,
      path,
      p0: { x: 0, y: Math.max(0, h - (cNet / maxPSI) * h) },
      p100: {
        x: (rGPM / maxGPM) * w,
        y: Math.max(0, h - (actRatedNet / maxPSI) * h),
      },
      p150: {
        x: (gpm150 / maxGPM) * w,
        y: Math.max(0, h - (predicted150Net / maxPSI) * h),
      },
      lineNFPA: Math.max(0, h - (min150NFPA / maxPSI) * h),
    };
  }, [mathData]);

  const saveTestToDB = async () => {
    if (!mathData.valid) {
      toast.error("Llene todos los parámetros operativos.");
      return;
    }
    if (!testName) {
      toast.error("Asigne un nombre al reporte.");
      return;
    }

    setIsSaving(true);
    const loadingToast = toast.loading("Guardando reporte en la nube...");

    try {
      const { error } = await supabase.from("pump_tests").insert([
        {
          test_name: testName.toUpperCase(),
          explanation: explanationText,
          rated_gpm: Number(ratedGPM),
          rated_psi: Number(ratedPSI),
          churn_suction: Number(churnSuction),
          churn_discharge: Number(churnDischarge),
          rated_suction: Number(ratedSuction),
          rated_discharge: Number(ratedDischarge),
          predicted_psi: mathData.predicted150Net,
          is_passing: mathData.isPassing,
        },
      ]);

      if (error) throw error;

      toast.success("Reporte guardado exitosamente", { id: loadingToast });
      clearForm();
      fetchHistory();
    } catch (err) {
      toast.error("Error al guardar: " + err.message, { id: loadingToast });
    } finally {
      setIsSaving(false);
    }
  };

  // --- LÓGICA PARA EL MODAL DE BORRADO ---
  const handleDeleteClick = (e, id, name) => {
    e.stopPropagation(); 
    setTestToDelete({ id, name });
    setShowDeleteModal(true); 
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setTestToDelete(null);
  };

  const confirmDelete = async () => {
    if (!testToDelete) return;
    
    const loadingToast = toast.loading("Eliminando reporte...");
    try {
      const { error } = await supabase
        .from("pump_tests")
        .delete()
        .eq("id", testToDelete.id);

      if (error) throw error;

      toast.success("Reporte eliminado", { id: loadingToast });
      
      if (currentViewId === testToDelete.id) {
        clearForm();
      }
      
      fetchHistory();
    } catch (err) {
      toast.error("Error al eliminar: " + err.message, { id: loadingToast });
    } finally {
      setShowDeleteModal(false);
      setTestToDelete(null);
    }
  };

  const loadTest = (test) => {
    setRatedGPM(test.rated_gpm);
    setRatedPSI(test.rated_psi);
    setChurnSuction(test.churn_suction);
    setChurnDischarge(test.churn_discharge);
    setRatedSuction(test.rated_suction);
    setRatedDischarge(test.rated_discharge);
    setTestName(test.test_name);
    setExplanationText(test.explanation || "");
    setCurrentViewId(test.id);
  };

  const clearForm = () => {
    setRatedGPM("");
    setRatedPSI("");
    setChurnSuction("");
    setChurnDischarge("");
    setRatedSuction("");
    setRatedDischarge("");
    setTestName("");
    setExplanationText("");
    setCurrentViewId(null);
  };

  // --- LÓGICA PARA GENERAR PDF PROFESIONAL ---
  const handleDownloadPDF = () => {
    if (!mathData.valid) {
      toast.error("Datos incompletos para generar el PDF.");
      return;
    }

    const toastId = toast.loading("Generando documento PDF...");
    
    // Extraemos la gráfica SVG en crudo para insertarla en el PDF
    const chartHtml = document.getElementById("chart-container")?.innerHTML || "";
    
    // Plantilla HTML Estilizada
    const printContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Reporte_${testName || "Bomba_NFPA"}</title>
        <style>
          body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1e293b; padding: 30px; max-width: 800px; margin: auto; }
          .header { border-bottom: 4px solid #dc2626; padding-bottom: 15px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end;}
          .header h1 { margin: 0; color: #0f172a; font-size: 24px; text-transform: uppercase;}
          .header p { margin: 5px 0 0; color: #64748b; font-size: 14px; }
          .badge { display: inline-block; padding: 6px 12px; border-radius: 4px; font-weight: bold; font-size: 14px; letter-spacing: 0.5px;}
          .pass { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0;}
          .fail { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca;}
          .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;}
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
          .card { border: 1px solid #cbd5e1; padding: 15px; border-radius: 8px; }
          .card h3 { margin-top: 0; font-size: 13px; color: #475569; text-transform: uppercase; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;}
          .data-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .data-label { color: #64748b; }
          .data-value { font-weight: 600; color: #0f172a; }
          .chart-box { margin-top: 30px; border: 1px solid #cbd5e1; padding: 20px; border-radius: 8px; text-align: center; }
          .chart-box svg { width: 100%; height: auto; max-height: 380px; }
          .notes { margin-top: 25px; padding: 15px; border-left: 4px solid #3b82f6; background: #f0f9ff; font-size: 14px; color: #1e3a8a;}
          .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 15px;}
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Eficiencia de Caudal</h1>
            <p>Reporte de Análisis Predictivo NFPA 25</p>
          </div>
          <div>
             <h2 style="margin:0; color:#dc2626;">TLETL</h2>
             <p style="font-size:10px; text-align:right;">Fire Systems</p>
          </div>
        </div>

        <div class="info-section">
          <div>
            <div style="font-size: 12px; color: #64748b; text-transform: uppercase;">Prueba / Sucursal</div>
            <div style="font-size: 18px; font-weight: bold; color: #0f172a; margin-bottom: 5px;">${testName || "S/N"}</div>
            <div style="font-size: 13px; color: #475569;">Fecha de Emisión: ${new Date().toLocaleDateString()}</div>
          </div>
          <div style="display: flex; align-items: center;">
            <span class="badge ${mathData.isPassing ? 'pass' : 'fail'}">
              RESULTADO: ${mathData.isPassing ? 'PASA (CUMPLE NFPA)' : 'FALLA (NO CUMPLE)'}
            </span>
          </div>
        </div>

        <div class="grid">
          <div class="card" style="border-top: 3px solid #cbd5e1;">
            <h3>Placa Nominal del Equipo</h3>
            <div class="data-row"><span class="data-label">Caudal Nominal</span> <span class="data-value">${ratedGPM} GPM</span></div>
            <div class="data-row"><span class="data-label">Presión Nominal</span> <span class="data-value">${ratedPSI} PSI</span></div>
          </div>
          <div class="card" style="border-top: 3px solid #3b82f6;">
            <h3>Resultados Proyectados (Matemáticos)</h3>
            <div class="data-row"><span class="data-label">Límite 65% NFPA</span> <span class="data-value">${mathData.min150NFPA.toFixed(1)} PSI</span></div>
            <div class="data-row"><span class="data-label">Proyección al 150%</span> <span class="data-value">${mathData.predicted150Net.toFixed(1)} PSI</span></div>
          </div>
        </div>

        <div class="grid">
           <div class="card" style="border-top: 3px solid #64748b;">
            <h3>Lecturas Churn (0% Caudal)</h3>
            <div class="data-row"><span class="data-label">Presión de Succión</span> <span class="data-value">${churnSuction} PSI</span></div>
            <div class="data-row"><span class="data-label">Presión de Descarga</span> <span class="data-value">${churnDischarge} PSI</span></div>
            <div class="data-row" style="margin-top: 5px; border-top: 1px dashed #cbd5e1; padding-top: 5px;"><span class="data-label">Presión Neta</span> <span class="data-value">${mathData.cNet} PSI</span></div>
          </div>
          <div class="card" style="border-top: 3px solid #22c55e;">
            <h3>Lecturas Nominales (100% Caudal)</h3>
            <div class="data-row"><span class="data-label">Presión de Succión</span> <span class="data-value">${ratedSuction} PSI</span></div>
            <div class="data-row"><span class="data-label">Presión de Descarga</span> <span class="data-value">${ratedDischarge} PSI</span></div>
            <div class="data-row" style="margin-top: 5px; border-top: 1px dashed #cbd5e1; padding-top: 5px;"><span class="data-label">Presión Neta</span> <span class="data-value">${mathData.actRatedNet} PSI</span></div>
          </div>
        </div>

        ${explanationText ? `
        <div class="notes">
          <strong style="text-transform: uppercase; font-size: 12px;">Notas Técnicas / Diagnóstico:</strong><br>
          <div style="margin-top: 5px;">${explanationText}</div>
        </div>
        ` : ''}

        <div class="chart-box">
          <h3 style="margin-top:0; color: #475569; font-size:14px; text-transform:uppercase;">Curva H-Q de Desempeño</h3>
          ${chartHtml}
        </div>

        <div class="footer">
          Documento generado electrónicamente por <strong>TLETL Fire Systems</strong>.<br>
          Este reporte es un cálculo predictivo basado en los datos ingresados en campo.
        </div>
        
        <script>
          // Imprime automáticamente en cuanto carga el documento oculto
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 500); // Cierra la pestaña tras imprimir/guardar
          }
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    toast.dismiss(toastId);
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6 relative">
      {/* HEADER CON BOTONES NUEVOS */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
            <Calculator size={24} className="text-red-600 dark:text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Eficiencia de Caudal
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Análisis Predictivo NFPA 25
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* BOTÓN DESCARGAR PDF */}
          {mathData.valid && (
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <Download size={16} /> Exportar PDF
            </button>
          )}

          {currentViewId && (
            <button
              onClick={clearForm}
              className="px-4 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm active:scale-95"
            >
              <X size={16} /> Nuevo Análisis
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ================================================= */}
        {/* COLUMNA 1: HISTORIAL (3/12) */}
        {/* ================================================= */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm h-[800px] flex flex-col">
            <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-4">
              <History
                size={14}
                className="text-slate-400 dark:text-slate-500"
              />{" "}
              Historial de Pruebas
            </h3>

            <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-1">
              {savedTests.length === 0 ? (
                <div className="text-center py-10 opacity-50">
                  <FileText
                    size={28}
                    className="mx-auto mb-3 text-slate-300 dark:text-slate-600"
                  />
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Sin registros
                  </p>
                </div>
              ) : (
                savedTests.map((test) => (
                  <div
                    key={test.id}
                    onClick={() => loadTest(test)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all active:scale-[0.98] ${currentViewId === test.id ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 shadow-sm" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:shadow-sm"}`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock size={10} />{" "}
                        {new Date(test.created_at).toLocaleDateString()}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteClick(e, test.id, test.test_name)}
                        className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors p-1"
                        title="Eliminar reporte"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-tight mb-2">
                      {test.test_name}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-medium ${test.is_passing ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"}`}
                      >
                        {test.is_passing ? "Aprobado" : "Fallo"}
                      </span>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {test.predicted_psi?.toFixed(1)} PSI
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* COLUMNA 2: CAPTURA DE DATOS (3/12) */}
        {/* ================================================= */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-slate-800 dark:bg-slate-400 rounded-r"></div>
            <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2 ml-2">
              <ShieldCheck
                size={14}
                className="text-slate-600 dark:text-slate-400"
              />{" "}
              Placa Nominal
            </h3>
            <div className="grid grid-cols-2 gap-3 ml-2">
              <div>
                <label className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5 block">
                  Caudal (GPM)
                </label>
                <input
                  type="number"
                  value={ratedGPM}
                  onChange={(e) => setRatedGPM(e.target.value)}
                  disabled={!!currentViewId}
                  placeholder="Ej: 500"
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm transition-colors disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5 block">
                  Presión (PSI)
                </label>
                <input
                  type="number"
                  value={ratedPSI}
                  onChange={(e) => setRatedPSI(e.target.value)}
                  disabled={!!currentViewId}
                  placeholder="Ej: 120"
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 text-sm transition-colors disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 rounded-r"></div>
            <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2 ml-2">
              <Gauge size={14} className="text-blue-500 dark:text-blue-400" />{" "}
              Churn (0% Caudal)
            </h3>
            <div className="grid grid-cols-2 gap-3 ml-2">
              <div>
                <label className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5 block">
                  Succión (PSI)
                </label>
                <input
                  type="number"
                  value={churnSuction}
                  onChange={(e) => setChurnSuction(e.target.value)}
                  disabled={!!currentViewId}
                  placeholder="0"
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5 block">
                  Descarga (PSI)
                </label>
                <input
                  type="number"
                  value={churnDischarge}
                  onChange={(e) => setChurnDischarge(e.target.value)}
                  disabled={!!currentViewId}
                  placeholder="0"
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition-colors disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500 rounded-r"></div>
            <h3 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2 ml-2">
              <Droplets
                size={14}
                className="text-green-500 dark:text-green-400"
              />{" "}
              Flujo Nominal (100%)
            </h3>
            <div className="grid grid-cols-2 gap-3 ml-2">
              <div>
                <label className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5 block">
                  Succión (PSI)
                </label>
                <input
                  type="number"
                  value={ratedSuction}
                  onChange={(e) => setRatedSuction(e.target.value)}
                  disabled={!!currentViewId}
                  placeholder="0"
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-sm transition-colors disabled:opacity-50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-400 dark:text-slate-500 mb-1.5 block">
                  Descarga (PSI)
                </label>
                <input
                  type="number"
                  value={ratedDischarge}
                  onChange={(e) => setRatedDischarge(e.target.value)}
                  disabled={!!currentViewId}
                  placeholder="0"
                  className="w-full p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-sm transition-colors disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
            <h3 className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-3 flex items-center gap-2">
              <FileText
                size={14}
                className="text-slate-500 dark:text-slate-400"
              />{" "}
              Documentar Reporte
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                disabled={!!currentViewId}
                placeholder="Nombre del equipo o sucursal..."
                className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 disabled:opacity-50"
              />
              <textarea
                value={explanationText}
                onChange={(e) => setExplanationText(e.target.value)}
                disabled={!!currentViewId}
                placeholder="Notas técnicas o diagnóstico del resultado..."
                className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-600 dark:text-slate-300 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none h-24 disabled:opacity-50"
              />

              {!currentViewId && (
                <button
                  onClick={saveTestToDB}
                  disabled={isSaving}
                  className="w-full py-3.5 mt-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium text-sm shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {isSaving ? (
                    "Guardando..."
                  ) : (
                    <>
                      <Save size={16} /> Guardar Resultado
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* COLUMNA 3: GRÁFICA Y RESULTADOS (6/12) */}
        {/* ================================================= */}
        <div className="lg:col-span-6 h-[800px] flex flex-col">
          <div className="bg-slate-900 p-6 md:p-8 rounded-xl shadow-lg h-full flex flex-col border-t-4 border-red-600 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 text-white rounded-lg border border-white/5">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg leading-none">
                    Curva H-Q
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Simulador de Desempeño
                  </p>
                </div>
              </div>
            </div>

            {!mathData.valid ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                <Activity size={64} className="text-slate-600 mb-5" />
                <p className="text-sm font-medium text-slate-300">
                  Esperando Parámetros
                </p>
                <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
                  El motor predictivo generará la gráfica automáticamente al
                  completar los datos del equipo.
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col space-y-5 relative z-10">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Info size={12} className="text-slate-400" />
                      <p className="text-xs text-slate-400">
                        Mínimo Exigido NFPA
                      </p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-semibold text-white tracking-tight">
                        {mathData.min150NFPA.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-500">PSI</span>
                    </div>
                  </div>

                  <div
                    className={`p-4 rounded-xl border ${mathData.isPassing ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {mathData.isPassing ? (
                        <CheckCircle2 size={12} className="text-green-400" />
                      ) : (
                        <Activity size={12} className="text-red-400" />
                      )}
                      <p
                        className={`text-xs ${mathData.isPassing ? "text-green-400" : "text-red-400"}`}
                      >
                        Proyección 150%
                      </p>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-semibold text-white tracking-tight">
                        {mathData.predicted150Net.toFixed(1)}
                      </span>
                      <span className="text-xs text-white/40">PSI</span>
                    </div>
                  </div>
                </div>

                {/* Contenedor Gráfica CON ID PARA PDF */}
                <div 
                  id="chart-container" 
                  className="flex-1 bg-slate-950 rounded-xl border border-slate-800 p-5 flex items-center justify-center shadow-inner relative overflow-hidden"
                >
                  <div className="relative w-full h-full min-h-[300px]">
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-medium text-slate-500 uppercase tracking-wide">
                      Presión (PSI)
                    </div>
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-medium text-slate-500 uppercase tracking-wide">
                      Caudal (GPM)
                    </div>

                    <svg
                      viewBox={`0 0 ${chartData.w} ${chartData.h}`}
                      className="w-full h-full overflow-hidden"
                    >
                      <line x1="0" y1={chartData.h * 0.25} x2={chartData.w} y2={chartData.h * 0.25} stroke="#1e293b" strokeWidth="1" />
                      <line x1="0" y1={chartData.h * 0.5} x2={chartData.w} y2={chartData.h * 0.5} stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" />
                      <line x1="0" y1={chartData.h * 0.75} x2={chartData.w} y2={chartData.h * 0.75} stroke="#1e293b" strokeWidth="1" />
                      <line x1={chartData.w * 0.5} y1="0" x2={chartData.w * 0.5} y2={chartData.h} stroke="#1e293b" strokeWidth="1" strokeDasharray="4,4" />
                      <line x1="0" y1={chartData.h} x2={chartData.w} y2={chartData.h} stroke="#475569" strokeWidth="3" />
                      <line x1="0" y1="0" x2="0" y2={chartData.h} stroke="#475569" strokeWidth="3" />
                      <line x1="0" y1={chartData.lineNFPA} x2={chartData.w} y2={chartData.lineNFPA} stroke="#ef4444" strokeWidth="2" strokeDasharray="8,8" opacity="0.8" />
                      <text x="10" y={chartData.lineNFPA - 10} fill="#ef4444" fontSize="12" fontWeight="bold" opacity="0.8">Límite 65% NFPA</text>
                      
                      <path d={chartData.path} fill="none" stroke="#3b82f6" strokeWidth="4" strokeLinecap="round" />
                      
                      <circle cx={chartData.p0.x} cy={chartData.p0.y} r="6" fill="#3b82f6" stroke="#020617" strokeWidth="3" />
                      <circle cx={chartData.p100.x} cy={chartData.p100.y} r="6" fill="#3b82f6" stroke="#020617" strokeWidth="3" />
                      <circle cx={chartData.p150.x} cy={chartData.p150.y} r="8" fill={mathData.isPassing ? "#22c55e" : "#ef4444"} stroke="#020617" strokeWidth="3" />

                      <text x={chartData.p150.x + 15} y={chartData.p150.y + 5} fill={mathData.isPassing ? "#4ade80" : "#f87171"} fontSize="14" fontWeight="700" className="drop-shadow-md">
                        {mathData.isPassing ? "PASA" : "FALLA"}
                      </text>
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- MODAL PERSONALIZADO DE ELIMINACIÓN --- */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-xl shadow-xl relative overflow-hidden flex flex-col text-slate-700 dark:text-slate-300 border-t-4 border-red-600 animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex items-start gap-4">
              <div className="bg-red-50 dark:bg-red-900/20 p-2.5 rounded-full shrink-0">
                <AlertTriangle size={24} className="text-red-600 dark:text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white mt-1">
                  Confirmar Eliminación
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                  ¿Estás seguro de que deseas eliminar el reporte de la prueba <strong>"{testToDelete?.name}"</strong>? Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-800 flex gap-3 shrink-0">
              <button
                onClick={cancelDelete}
                className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium text-sm py-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium text-sm py-2.5 rounded-lg shadow-sm transition-all active:scale-95"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
