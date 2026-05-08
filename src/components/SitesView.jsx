import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-cluster'; // NUEVA IMPORTACIÓN
import { 
  Navigation, Signal, SignalLow, LocateFixed, 
  Search, ShieldAlert, Activity, LayoutGrid, MapPin, Navigation2
} from 'lucide-react';
import { db } from '../db';

// --- ICONO DE USUARIO ---
const userIcon = L.divIcon({
  className: 'custom-user-icon',
  html: `<div style="position:relative;">
          <div style="position:absolute; top:-12px; left:-12px; width:40px; height:40px; background:rgba(37,99,235,0.2); border-radius:50%; animation: pulse 2s infinite;"></div>
          <div style="width:16px; height:16px; background:#2563eb; border:3px solid white; border-radius:50%; box-shadow: 0 0 10px rgba(0,0,0,0.3);"></div>
         </div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});

function MapController({ center }) {
  const map = useMap();
  useEffect(() => { 
    if (center && center[0] && center[1]) {
      map.flyTo(center, 17, { duration: 1.5 }); 
    }
  }, [center, map]);
  return null;
}

export default function SitesView() {
  const [sites, setSites] = useState([]);
  const [filteredSites, setFilteredSites] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [userPos, setUserPos] = useState(null);
  const [mapFocus, setMapFocus] = useState(null);
  const watchId = useRef(null);

  useEffect(() => {
    loadSitesFromDB();
    startTracking();
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
    };
  }, []);

  const loadSitesFromDB = async () => {
    try {
      const all = await db.inspections.toArray();
      const valid = all.filter(ins => ins.location?.lat && ins.location?.lng);
      setSites(valid);
      setFilteredSites(valid);
    } catch (e) { console.error("Error DB:", e); }
  };

  const startTracking = () => {
    if ("geolocation" in navigator) {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.warn(err),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  useEffect(() => {
    let result = sites;
    if (activeFilter === 'CRITICAL') result = result.filter(s => s.overallStatus === 'CRÍTICO');
    else if (activeFilter !== 'ALL') result = result.filter(s => s.serviceCode === activeFilter);
    
    if (searchTerm) {
      result = result.filter(s => 
        (s.equipmentName || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.serviceCode || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredSites(result);
  }, [searchTerm, activeFilter, sites]);

  return (
    <div className="h-full flex flex-col bg-[#0f172a] text-slate-200">
      
      {/* HEADER COMPACTO */}
      <div className="bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 p-3 md:p-4 flex flex-col md:flex-row justify-between items-center gap-3 z-[1000]">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-500/20">
            <Activity size={18} className="text-white animate-pulse"/>
          </div>
          <div>
            <h2 className="font-black text-xs md:text-sm tracking-tight text-white uppercase italic leading-none">Site Intel Live</h2>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Real-Time Assets</p>
          </div>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={15} />
          <input 
            type="text" 
            placeholder="Buscar ID de equipo..."
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-2 pl-9 pr-4 text-[11px] md:text-xs font-bold text-white outline-none focus:ring-2 ring-blue-500/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ÁREA DEL MAPA */}
      <div className="flex-1 relative w-full h-full min-h-0">
        <MapContainer center={[20.9673, -89.5925]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Modern View">
              <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satellite">
              <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" />
            </LayersControl.BaseLayer>
          </LayersControl>

          {mapFocus && <MapController center={mapFocus} />}
          {userPos && <Marker position={userPos} icon={userIcon} />}

          {/* --- GRUPO DE CLUSTERS (EVITA EL ACHOCADO) --- */}
          <MarkerClusterGroup 
            chunkedLoading 
            maxClusterRadius={40} 
            spiderfyOnMaxZoom={true}
          >
            {filteredSites.map((site) => (
              <Marker 
                key={site.id} 
                position={[site.location.lat, site.location.lng]}
                icon={L.divIcon({
                  className: 'custom-marker',
                  html: `<div style="display:flex; align-items:center; justify-content:center;">
                          <div style="width:28px; height:28px; background:${site.overallStatus === 'CRÍTICO' ? '#ef4444' : '#10b981'}; border:2px solid white; border-radius:8px; color:white; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:10px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
                            ${site.serviceCode.split('-')[1]}
                          </div>
                         </div>`,
                  iconSize: [28, 28]
                })}
              >
                <Popup>
                  <div className="p-2.5 bg-slate-900 text-white rounded-xl min-w-[190px]">
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-[9px] font-black bg-blue-600 px-2 py-0.5 rounded-md tracking-tighter">{site.serviceCode}</span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${site.overallStatus === 'CRÍTICO' ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}>
                        {site.overallStatus}
                      </span>
                    </div>
                    <h4 className="font-black text-xs uppercase leading-tight text-white mb-1.5">{site.equipmentName}</h4>
                    <p className="text-[10px] text-slate-400 mb-3.5 flex items-center gap-1.5"><MapPin size={11}/> {site.location.address?.split(',')[0]}</p>
                    <button 
                      className="w-full bg-white text-slate-900 text-[10px] font-black py-2.5 rounded-lg flex items-center justify-center gap-2 uppercase tracking-widest active:bg-blue-500 active:text-white"
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${site.location.lat},${site.location.lng}`)}
                    >
                      <Navigation2 size={12}/> Route
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>

        {/* BOTÓN GPS */}
        <div className="absolute bottom-44 right-4 md:right-6 z-[1000]">
          <button 
            onClick={() => userPos && setMapFocus([...userPos])}
            className="bg-slate-900 p-4 rounded-2xl shadow-2xl border border-slate-700 text-blue-400 active:scale-90"
          >
            <LocateFixed size={24} />
          </button>
        </div>

        {/* FILTROS - Diseño deslizable para móvil */}
        <div className="absolute top-4 left-4 right-4 md:right-auto md:top-6 md:left-6 z-[1000] flex flex-col gap-2 max-w-[calc(100%-2rem)]">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 p-2.5 rounded-2xl shadow-2xl">
            <div className="flex md:flex-col gap-1.5 overflow-x-auto md:overflow-visible pb-1 md:pb-0 scrollbar-none">
              
              <button onClick={() => setActiveFilter('ALL')} className={`shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[10px] font-black transition-all ${activeFilter === 'ALL' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>
                <LayoutGrid size={15}/> TODOS
              </button>
              
              <button onClick={() => setActiveFilter('CRITICAL')} className={`shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[10px] font-black transition-all ${activeFilter === 'CRITICAL' ? 'bg-red-600 text-white shadow-lg' : 'bg-slate-800 text-red-500/70'}`}>
                <ShieldAlert size={15}/> CRÍTICOS
              </button>
              
              <div className="flex md:grid md:grid-cols-2 gap-1.5 border-l md:border-none border-slate-700 pl-1.5 md:pl-0">
                {['IPM-01', 'IPM-02', 'IPM-03', 'IPM-04', 'IPM-05', 'IPM-06', 'IPM-07', 'IPM-08'].map(id => (
                  <button 
                    key={id}
                    onClick={() => setActiveFilter(id)}
                    className={`shrink-0 md:shrink p-2 rounded-lg text-[9px] font-black transition-all border ${
                      activeFilter === id ? 'bg-slate-200 text-slate-900 border-white' : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    {id.split('-')[1]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* WIDGET DE ANÁLISIS - Pegado abajo en móvil */}
        <div className="absolute bottom-6 left-4 right-4 md:left-6 md:right-auto md:w-80 z-[1000]">
          <div className="bg-slate-900/95 backdrop-blur-2xl border border-slate-700/50 p-4 md:p-5 rounded-[2rem] shadow-2xl">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Activity size={14} className="text-blue-500" /> Data Analysis
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="bg-slate-800/50 p-3.5 rounded-2xl border border-slate-700/50">
                <span className="block text-[8px] font-black text-slate-500 uppercase mb-1">Found</span>
                <span className="text-lg md:text-2xl font-black text-white tracking-tighter">{filteredSites.length}</span>
              </div>
              <div className="bg-red-500/10 p-3.5 rounded-2xl border border-red-500/20">
                <span className="block text-[8px] font-black text-red-500 uppercase mb-1">Alerts</span>
                <span className="text-lg md:text-2xl font-black text-red-500 tracking-tighter">
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