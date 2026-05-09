import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { 
  LocateFixed, Search, ShieldAlert, LayoutGrid, MapPin, 
  Navigation2, Flame, Droplets, Bell, ChevronRight, Filter
} from 'lucide-react';
import { db } from '../db';

// --- ESTILOS CSS REFINADOS ---
const mapStyles = `
  .leaflet-top.leaflet-right { margin-top: 140px !important; margin-right: 12px !important; }
  .leaflet-control-layers { 
    border-radius: 12px !important; 
    background: #1a1a1a !important; 
    color: white !important; 
    border: 1px solid rgba(255,255,255,0.1) !important; 
  }
  .custom-cluster-icon { background: #ef4444; border: 2px solid white; border-radius: 50%; color: white; font-weight: 900; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(239, 68, 68, 0.5); }
  .leaflet-control-attribution { display: none !important; }
  .hide-scrollbar::-webkit-scrollbar { display: none; }
`;

const userIcon = L.divIcon({
  className: 'custom-user-icon',
  html: `<div style="position:relative;"><div style="position:absolute; top:-10px; left:-10px; width:36px; height:36px; background:rgba(239,68,68,0.2); border-radius:50%; animation: pulse 2s infinite;"></div><div style="width:16px; height:16px; background:#ef4444; border:3px solid white; border-radius:50%;"></div></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});

function MapController({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 17, { duration: 1.5 }); }, [center, map]);
  return null;
}

export default function SitesView() {
  const [sites, setSites] = useState([]);
  const [filteredSites, setFilteredSites] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNFPA, setSelectedNFPA] = useState('ALL'); 
  const [selectedType, setSelectedType] = useState('ALL'); 
  const [userPos, setUserPos] = useState(null);
  const [mapFocus, setMapFocus] = useState(null);
  const watchId = useRef(null);

  const categories = {
    'NFPA 25': ['BOMBAS', 'HIDRANTES', 'MANGUERAS', 'ROCIADORES', 'VÁLVULAS', 'OBSERVACIONES'],
    'NFPA 72': ['ALARMAS']
  };

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

  useEffect(() => {
    let result = sites;
    if (selectedNFPA !== 'ALL') result = result.filter(s => s.standard === selectedNFPA);
    if (selectedType !== 'ALL') {
      const typeMap = { 'BOMBAS': ['IPM-01', 'IPM-08'], 'MANGUERAS': ['IPM-02'], 'ALARMAS': ['IPM-03'], 'HIDRANTES': ['IPM-04'], 'VÁLVULAS': ['IPM-05'], 'ROCIADORES': ['IPM-06'], 'OBSERVACIONES': ['IPM-07'] };
      result = result.filter(s => typeMap[selectedType]?.includes(s.serviceCode));
    }
    if (searchTerm) result = result.filter(s => (s.equipmentName || '').toLowerCase().includes(searchTerm.toLowerCase()));
    setFilteredSites(result);
  }, [sites, selectedNFPA, selectedType, searchTerm]);

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] overflow-hidden relative">
      <style>{mapStyles}</style>

      {/* HEADER TÉCNICO - BUSCADOR PEQUEÑO */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[90%] md:w-[500px] z-[1000]">
        <div className="bg-[#1a1a1a]/95 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-2xl">
          <Search className="text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Buscar ID o Equipo..."
            className="bg-transparent border-none w-full text-white font-bold text-xs outline-none placeholder:text-slate-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 relative w-full h-full min-h-0">
        
        {/* FILTRADO PEQUEÑO Y ELEGANTE (LADO IZQUIERDO) */}
        <div className="absolute top-20 left-4 z-[1000] flex flex-col gap-2">
          <div className="bg-[#1a1a1a]/95 backdrop-blur-md border border-white/10 p-1 rounded-2xl shadow-2xl flex flex-col gap-1 w-fit">
            <button 
              onClick={() => { setSelectedNFPA('ALL'); setSelectedType('ALL'); }} 
              className={`p-3 rounded-xl transition-all ${selectedNFPA === 'ALL' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white/5'}`}
            >
              <LayoutGrid size={18}/>
            </button>
            <div className="h-[1px] w-6 bg-white/10 mx-auto"></div>
            <button 
              onClick={() => { setSelectedNFPA('NFPA 25'); setSelectedType('ALL'); }} 
              className={`p-3 rounded-xl transition-all ${selectedNFPA === 'NFPA 25' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Droplets size={18}/>
            </button>
            <button 
              onClick={() => { setSelectedNFPA('NFPA 72'); setSelectedType('ALL'); }} 
              className={`p-3 rounded-xl transition-all ${selectedNFPA === 'NFPA 72' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Bell size={18}/>
            </button>
          </div>

          {/* SUB-CATEGORÍAS MINI */}
          {selectedNFPA !== 'ALL' && (
            <div className="bg-[#1a1a1a]/90 backdrop-blur-md border border-white/5 p-1.5 rounded-xl shadow-xl flex flex-col gap-1 animate-in slide-in-from-left duration-300">
              {categories[selectedNFPA].map(cat => (
                <button 
                  key={cat} 
                  onClick={() => setSelectedType(cat === selectedType ? 'ALL' : cat)} 
                  className={`px-3 py-2 rounded-lg text-[8px] font-black transition-all ${
                    selectedType === cat ? 'bg-red-600 text-white' : 'text-slate-500 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        <MapContainer center={[20.9673, -89.5925]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <LayersControl position="bottomright">
            <LayersControl.BaseLayer checked name="🌐 Calles"><TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" /></LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="🛰️ Satélite"><TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" /></LayersControl.BaseLayer>
          </LayersControl>

          <MapController center={mapFocus} />
          {userPos && <Marker position={userPos} icon={userIcon} />}

          <MarkerClusterGroup chunkedLoading maxClusterRadius={40}>
            {filteredSites.map((site) => (
              <Marker 
                key={site.id} 
                position={[site.location.lat, site.location.lng]}
                icon={L.divIcon({
                  className: 'custom-marker',
                  html: `<div style="width:30px; height:34px; background:${site.overallStatus === 'CRÍTICO' ? '#ef4444' : '#10b981'}; border:2px solid white; border-radius:8px; color:white; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:9px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                            ${site.serviceCode.split('-')[1]}
                          </div>`,
                  iconSize: [30, 34]
                })}
              >
                <Popup>
                  <div className="p-2 bg-[#1a1a1a] text-white rounded-xl min-w-[180px]">
                    <span className="text-[9px] font-black text-red-500 uppercase">{site.serviceCode}</span>
                    <h4 className="font-black text-xs uppercase mb-2">{site.equipmentName}</h4>
                    <button className="w-full bg-red-600 text-white text-[9px] font-black py-2 rounded-lg flex items-center justify-center gap-2 uppercase" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${site.location.lat},${site.location.lng}`)}>
                      <Navigation2 size={12}/> Ruta
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>

        {/* BOTONES FLOTANTES ACCIÓN */}
        <div className="absolute bottom-32 right-4 z-[1000] flex flex-col gap-2">
          <button onClick={() => { setSelectedNFPA('ALL'); setSelectedType('ALL'); setSearchTerm(''); }} className="bg-[#1a1a1a] p-3.5 rounded-2xl border border-white/10 text-slate-400 active:scale-90 shadow-xl">
             <Filter size={20} />
          </button>
          <button onClick={() => userPos && setMapFocus([...userPos])} className="bg-red-600 p-3.5 rounded-2xl border border-red-400 text-white active:scale-90 shadow-xl">
            <LocateFixed size={20} />
          </button>
        </div>

        {/* FOOTER ANALYTICS MINI */}
        <div className="absolute bottom-6 left-4 right-4 z-[1000]">
          <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 p-4 rounded-[1.5rem] shadow-2xl max-w-xl mx-auto flex items-center justify-around">
            <div className="text-center">
              <span className="block text-[7px] font-black text-slate-500 uppercase">Activos</span>
              <span className="text-lg font-black text-white">{filteredSites.length}</span>
            </div>
            <div className="h-6 w-[1px] bg-white/10"></div>
            <div className="text-center">
              <span className="block text-[7px] font-black text-red-500 uppercase">Críticos</span>
              <span className="text-lg font-black text-red-500">
                {filteredSites.filter(s => s.overallStatus === 'CRÍTICO').length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}