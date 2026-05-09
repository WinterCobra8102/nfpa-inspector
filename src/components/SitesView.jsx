import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { 
  Navigation, Signal, SignalLow, LocateFixed, 
  Search, ShieldAlert, Activity, LayoutGrid, MapPin, Navigation2,
  Layers, Flame, AlertCircle, ChevronRight
} from 'lucide-react';
import { db } from '../db';

// --- ESTILOS CSS CORREGIDOS PARA MÓVIL ---
const mapStyles = `
  /* Posicionamos los controles de Leaflet para que no los tape el header */
  .leaflet-top.leaflet-right {
    margin-top: 180px !important; /* Baja el selector de capas debajo de los filtros */
    margin-right: 12px !important;
  }

  .leaflet-control-layers {
    border-radius: 16px !important;
    border: 2px solid rgba(255,255,255,0.1) !important;
    background: #1a1a1a !important;
    color: white !important;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
  }

  .leaflet-control-layers-list { 
    padding: 12px; 
    font-weight: 900; 
    font-size: 10px; 
    text-transform: uppercase; 
    letter-spacing: 1px;
  }

  /* Estilo de los Clusters (Cuando hay muchos reportes juntos) */
  .custom-cluster-icon {
    background: #ef4444;
    border: 3px solid white;
    border-radius: 50%;
    color: white;
    font-weight: 900;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 20px rgba(239, 68, 68, 0.6);
    font-size: 14px;
  }

  /* Esconder el botón de atribución de Leaflet para más limpieza */
  .leaflet-control-attribution { display: none !important; }
`;

const userIcon = L.divIcon({
  className: 'custom-user-icon',
  html: `<div style="position:relative;">
          <div style="position:absolute; top:-12px; left:-12px; width:40px; height:40px; background:rgba(239,68,68,0.2); border-radius:50%; animation: pulse 2s infinite;"></div>
          <div style="width:18px; height:18px; background:#ef4444; border:3px solid white; border-radius:50%; box-shadow: 0 0 15px rgba(0,0,0,0.5);"></div>
         </div>`,
  iconSize: [18, 18], iconAnchor: [9, 9],
});

function MapController({ center }) {
  const map = useMap();
  useEffect(() => { 
    if (center && center[0]) map.flyTo(center, 17, { duration: 1.5 }); 
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
        null, { enableHighAccuracy: true }
      );
    }
  };

  const handleCenterUser = () => {
    if (userPos) setMapFocus([...userPos]);
    else {
      navigator.geolocation.getCurrentPosition((pos) => {
        const c = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(c); setMapFocus(c);
      }, () => alert("Active el GPS"), { enableHighAccuracy: true });
    }
  };

  useEffect(() => {
    let result = sites;
    if (activeFilter === 'CRITICAL') result = result.filter(s => s.overallStatus === 'CRÍTICO');
    else if (activeFilter !== 'ALL') result = result.filter(s => s.serviceCode === activeFilter);
    if (searchTerm) result = result.filter(s => (s.equipmentName || '').toLowerCase().includes(searchTerm.toLowerCase()));
    setFilteredSites(result);
  }, [searchTerm, activeFilter, sites]);

  const createClusterCustomIcon = (cluster) => {
    return L.divIcon({
      html: `<span>${cluster.getChildCount()}</span>`,
      className: 'custom-cluster-icon',
      iconSize: L.point(40, 40, true),
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#0f172a] text-slate-200">
      <style>{mapStyles}</style>

      {/* HEADER TLETL RADAR */}
      <div className="bg-[#1a1a1a] border-b border-white/5 p-4 flex flex-col gap-4 z-[5000] shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-xl shadow-lg shadow-red-900/40">
              <Flame size={18} className="text-white animate-pulse"/>
            </div>
            <div>
              <h2 className="font-black text-xs tracking-tighter text-white uppercase italic">Fire Asset Radar</h2>
              <p className="text-[8px] text-red-500 font-black uppercase tracking-widest leading-none">Live Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
             <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active System</span>
          </div>
        </div>

        <div className="relative">
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
          
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="🗺️ Ver Calles">
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="🛰️ Satélite">
              <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" />
            </LayersControl.BaseLayer>
          </LayersControl>

          <MapController center={mapFocus} />
          {userPos && <Marker position={userPos} icon={userIcon} />}

          <MarkerClusterGroup 
            chunkedLoading 
            iconCreateFunction={createClusterCustomIcon}
            maxClusterRadius={45}
            spiderfyOnMaxZoom={true}
          >
            {filteredSites.map((site) => (
              <Marker 
                key={site.id} 
                position={[site.location.lat, site.location.lng]}
                icon={L.divIcon({
                  className: 'custom-marker',
                  html: `<div style="width:34px; height:34px; background:${site.overallStatus === 'CRÍTICO' ? '#ef4444' : '#10b981'}; border:3px solid white; border-radius:12px; color:white; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:10px; box-shadow: 0 8px 15px rgba(0,0,0,0.4);">
                            ${site.serviceCode.split('-')[1]}
                          </div>`,
                  iconSize: [34, 34]
                })}
              >
                <Popup>
                  <div className="p-3 bg-[#1a1a1a] text-white rounded-2xl min-w-[200px] border border-white/10 shadow-2xl">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black bg-red-600/20 px-2 py-0.5 rounded text-red-500 uppercase">{site.serviceCode}</span>
                      <div className={`w-2.5 h-2.5 rounded-full ${site.overallStatus === 'CRÍTICO' ? 'bg-red-500 animate-ping' : 'bg-green-500'}`}></div>
                    </div>
                    <h4 className="font-black text-xs uppercase text-white mb-1 leading-tight">{site.equipmentName}</h4>
                    <p className="text-[9px] text-slate-400 mb-4 flex items-center gap-1.5"><MapPin size={12} className="text-red-500"/> {site.location.address?.split(',')[0]}</p>
                    <button 
                      className="w-full bg-white text-black text-[10px] font-black py-3 rounded-xl flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95 transition-all shadow-lg"
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${site.location.lat},${site.location.lng}`)}
                    >
                      <Navigation2 size={14}/> Ir al Sitio
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>

        {/* BOTONES FLOTANTES DE NAVEGACIÓN */}
        <div className="absolute top-44 left-4 z-[4000] flex flex-col gap-2">
          <button onClick={() => setActiveFilter('ALL')} className={`p-3 rounded-2xl shadow-2xl border-2 transition-all ${activeFilter === 'ALL' ? 'bg-red-600 border-red-400 text-white' : 'bg-[#1a1a1a] border-white/10 text-slate-400'}`}>
            <LayoutGrid size={20}/>
          </button>
          <button onClick={() => setActiveFilter('CRITICAL')} className={`p-3 rounded-2xl shadow-2xl border-2 transition-all ${activeFilter === 'CRITICAL' ? 'bg-red-600 border-red-400 text-white animate-pulse' : 'bg-[#1a1a1a] border-white/10 text-red-500'}`}>
            <ShieldAlert size={20}/>
          </button>
        </div>

        {/* BOTÓN GPS CENTRAR */}
        <div className="absolute bottom-52 right-4 z-[4000]">
          <button 
            onClick={handleCenterUser}
            className="bg-red-600 p-4 rounded-2xl shadow-2xl border-2 border-red-400 text-white active:scale-90 transition-all"
          >
            <LocateFixed size={24} />
          </button>
        </div>

        {/* PANEL DE STATUS (ESTILO INDUSTRIAL) */}
        <div className="absolute bottom-8 left-4 right-4 z-[4000]">
          <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 p-5 rounded-[2.5rem] shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                 <Activity size={14} className="text-red-500" />
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Analysis</h3>
              </div>
              <ChevronRight size={14} className="text-slate-600" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-3xl border border-white/5 group active:bg-white/10 transition-colors">
                <span className="block text-[8px] font-black text-slate-500 uppercase mb-1">Activos Detectados</span>
                <span className="text-2xl font-black text-white tracking-tighter">{filteredSites.length}</span>
              </div>
              <div className="bg-red-500/10 p-4 rounded-3xl border border-red-500/20 active:bg-red-500/20 transition-colors">
                <span className="block text-[8px] font-black text-red-500 uppercase mb-1">Alertas Críticas</span>
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