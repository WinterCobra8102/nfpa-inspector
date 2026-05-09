import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { 
  Navigation, Signal, SignalLow, LocateFixed, 
  Search, ShieldAlert, Activity, LayoutGrid, MapPin, Navigation2,
  Layers, Flame, AlertCircle
} from 'lucide-react';
import { db } from '../db';

// --- ESTILOS CSS INYECTADOS ---
const mapStyles = `
  .leaflet-control-layers {
    border-radius: 16px !important;
    border: 2px solid rgba(255,255,255,0.1) !important;
    background: #1a1a1a !important;
    color: white !important;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
    margin-bottom: 20px !important;
  }
  .leaflet-control-layers-list { padding: 10px; font-weight: bold; font-size: 11px; text-transform: uppercase; }
  .leaflet-bar a { background-color: #1a1a1a !important; color: white !important; border-bottom: 1px solid #333 !important; }
  .custom-cluster-icon {
    background: #ef4444;
    border: 3px solid white;
    border-radius: 50%;
    color: white;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.4);
  }
`;

const userIcon = L.divIcon({
  className: 'custom-user-icon',
  html: `<div style="position:relative;">
          <div style="position:absolute; top:-12px; left:-12px; width:40px; height:40px; background:rgba(239,68,68,0.2); border-radius:50%; animation: pulse 2s infinite;"></div>
          <div style="width:16px; height:16px; background:#ef4444; border:3px solid white; border-radius:50%; box-shadow: 0 0 15px rgba(0,0,0,0.5);"></div>
         </div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});

// --- CONTROLADOR DE MOVIMIENTO DEL MAPA ---
function MapController({ center }) {
  const map = useMap();
  useEffect(() => { 
    if (center && center[0] && center[1]) {
      map.flyTo(center, 17, { duration: 1.5, easeLinearity: 0.25 }); 
    }
  }, [center, map]);
  return null;
}

export default function SitesView() {
  const [sites, setSites] = useState([]);
  const [filteredSites, setFilteredSites] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [userPos, setUserPos] = useState(null);
  const [mapFocus, setMapFocus] = useState(null);
  const watchId = useRef(null);

  useEffect(() => {
    loadSitesFromDB();
    startTracking();
    return () => { if (watchId.current) navigator.geolocation.clearWatch(watchId.current); };
  }, []);

  const loadSitesFromDB = async () => {
    const all = await db.inspections.toArray();
    const valid = all.filter(ins => ins.location?.lat && ins.location?.lng);
    setSites(valid);
    setFilteredSites(valid);
  };

  const startTracking = () => {
    if ("geolocation" in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.warn("GPS Watch Error:", err),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
  };

  // --- FUNCIÓN PARA CENTRAR UBICACIÓN (ARREGLADA) ---
  const handleCenterUser = () => {
    if (userPos) {
      // Si ya tenemos la posición del 'watch', la usamos
      setMapFocus([...userPos]);
    } else {
      // Si no, forzamos una petición única de alta precisión
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = [pos.coords.latitude, pos.coords.longitude];
          setUserPos(coords);
          setMapFocus(coords);
        },
        () => alert("Por favor, habilite el permiso de ubicación en su dispositivo."),
        { enableHighAccuracy: true }
      );
    }
  };

  useEffect(() => {
    let result = sites;
    if (activeFilter === 'CRITICAL') result = result.filter(s => s.overallStatus === 'CRÍTICO');
    else if (activeFilter !== 'ALL') result = result.filter(s => s.serviceCode === activeFilter);
    if (searchTerm) {
      result = result.filter(s => (s.equipmentName || '').toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setFilteredSites(result);
  }, [searchTerm, activeFilter, sites]);

  const createClusterCustomIcon = (cluster) => {
    return L.divIcon({
      html: `<span>${cluster.getChildCount()}</span>`,
      className: 'custom-cluster-icon',
      iconSize: L.point(35, 35, true),
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#0f172a] text-slate-200">
      <style>{mapStyles}</style>

      {/* HEADER INDUSTRIAL */}
      <div className="bg-[#1a1a1a] border-b border-white/5 p-4 flex flex-col md:flex-row justify-between items-center gap-4 z-[1000] shadow-2xl">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-red-600 p-2.5 rounded-2xl shadow-lg shadow-red-900/20">
            <Flame size={20} className="text-white animate-pulse"/>
          </div>
          <div>
            <h2 className="font-black text-sm tracking-tighter text-white uppercase italic leading-none">Fire Asset Radar</h2>
            <p className="text-[9px] text-red-500 font-black uppercase tracking-[0.2em] mt-1">Live Monitoring</p>
          </div>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
          <input 
            type="text" 
            placeholder="Buscar ID de activo..."
            className="w-full bg-black/30 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-white outline-none focus:ring-2 ring-red-600/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 relative w-full h-full min-h-0">
        <MapContainer center={[20.9673, -89.5925]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          
          <LayersControl position="bottomright">
            <LayersControl.BaseLayer checked name="🌐 Mapa">
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="🛰️ Satélite">
              <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" />
            </LayersControl.BaseLayer>
          </LayersControl>

          {/* Controlador se activa cuando mapFocus cambia */}
          <MapController center={mapFocus} />
          {userPos && <Marker position={userPos} icon={userIcon} />}

          <MarkerClusterGroup 
            chunkedLoading 
            iconCreateFunction={createClusterCustomIcon}
            maxClusterRadius={50}
            spiderfyOnMaxZoom={true}
          >
            {filteredSites.map((site) => (
              <Marker 
                key={site.id} 
                position={[site.location.lat, site.location.lng]}
                icon={L.divIcon({
                  className: 'custom-marker',
                  html: `<div style="width:32px; height:32px; background:${site.overallStatus === 'CRÍTICO' ? '#ef4444' : '#10b981'}; border:3px solid white; border-radius:12px; color:white; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:10px; box-shadow: 0 8px 15px rgba(0,0,0,0.4);">
                            ${site.serviceCode.split('-')[1]}
                          </div>`,
                  iconSize: [32, 32]
                })}
              >
                <Popup>
                  <div className="p-3 bg-[#1a1a1a] text-white rounded-2xl min-w-[200px]">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black bg-white/10 px-2 py-0.5 rounded text-red-500 uppercase">{site.serviceCode}</span>
                      <div className={`w-2.5 h-2.5 rounded-full ${site.overallStatus === 'CRÍTICO' ? 'bg-red-500 animate-ping' : 'bg-green-500'}`}></div>
                    </div>
                    <h4 className="font-black text-xs uppercase text-white mb-1 leading-tight">{site.equipmentName}</h4>
                    <p className="text-[9px] text-slate-400 mb-4 flex items-center gap-1.5"><MapPin size={12}/> {site.location.address?.split(',')[0]}</p>
                    <button 
                      className="w-full bg-red-600 text-white text-[10px] font-black py-3 rounded-xl flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-red-900/40"
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${site.location.lat},${site.location.lng}`)}
                    >
                      <Navigation2 size={14}/> Iniciar Ruta
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>

        {/* BOTÓN GPS ARREGLADO */}
        <div className="absolute bottom-52 right-4 z-[1000]">
          <button 
            onClick={handleCenterUser}
            className="bg-[#1a1a1a] p-4 rounded-2xl shadow-2xl border-2 border-white/10 text-red-500 active:scale-90 transition-transform hover:bg-red-600 hover:text-white"
          >
            <LocateFixed size={24} />
          </button>
        </div>

        {/* FILTROS Y WIDGET (Se mantienen igual) */}
        <div className="absolute top-4 left-4 right-4 md:right-auto md:w-72 z-[1000]">
          <div className="bg-[#1a1a1a]/95 backdrop-blur-md border border-white/10 p-3 rounded-3xl shadow-2xl overflow-hidden">
            <div className="flex md:flex-col gap-2 overflow-x-auto scrollbar-none pb-1 md:pb-0">
              <button onClick={() => setActiveFilter('ALL')} className={`shrink-0 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black transition-all ${activeFilter === 'ALL' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'bg-white/5 text-slate-400'}`}>
                <LayoutGrid size={16}/> TODOS
              </button>
              <button onClick={() => setActiveFilter('CRITICAL')} className={`shrink-0 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-[10px] font-black transition-all ${activeFilter === 'CRITICAL' ? 'bg-red-600 text-white animate-pulse' : 'bg-white/5 text-red-500/60'}`}>
                <ShieldAlert size={16}/> CRÍTICOS
              </button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-4 right-4 md:left-6 md:right-auto md:w-80 z-[1000]">
          <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 p-5 rounded-[2.5rem] shadow-2xl">
            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-3">
              <Activity size={14} className="text-red-500" />
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Radar Status</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
                <span className="block text-[8px] font-black text-slate-500 uppercase mb-1">Activos</span>
                <span className="text-2xl font-black text-white tracking-tighter">{filteredSites.length}</span>
              </div>
              <div className="bg-red-500/10 p-4 rounded-3xl border border-red-500/20">
                <span className="block text-[8px] font-black text-red-500 uppercase mb-1">Críticos</span>
                <span className="text-2xl font-black text-red-500 tracking-tighter">
                  {filteredSites.filter(s => s.overallStatus === 'CRÍTICO').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}