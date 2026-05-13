import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { 
  LocateFixed, Search, LayoutGrid, MapPin, 
  Navigation2, Droplets, Bell, ChevronRight, X, Loader2, PlusCircle, ShieldCheck
} from 'lucide-react';
import { db } from '../db';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

// --- ESTILOS CSS REFORZADOS ---
const mapStyles = `
  .leaflet-top.leaflet-right { margin-top: 140px !important; margin-right: 12px !important; }
  .leaflet-control-attribution { display: none !important; }
  .suggestions-container { 
    position: absolute; top: 75px; left: 0; right: 0; background: #111827; 
    border-radius: 24px; border: 1px solid rgba(255,255,255,0.1); 
    z-index: 10005 !important; max-height: 400px; overflow-y: auto; 
    box-shadow: 0 30px 60px -12px rgba(0,0,0,0.9);
    padding: 8px;
  }
  .suggestion-item { 
    padding: 16px; color: #f3f4f6; font-size: 11px; font-weight: 600; 
    border-radius: 16px; cursor: pointer; 
    display: flex; align-items: center; gap: 14px; text-align: left;
    transition: all 0.2s;
    margin-bottom: 2px;
  }
  .suggestion-item:hover { background: #dc2626; color: white; transform: translateX(5px); }
  .suggestion-item .icon-circle { 
    width: 36px; height: 36px; border-radius: 12px; display: flex; 
    align-items: center; justify-content: center; background: rgba(255,255,255,0.05);
    color: #94a3b8;
  }
  .suggestion-item:hover .icon-circle { background: rgba(255,255,255,0.2); color: white; }
`;

// ICONOS PERSONALIZADOS
const searchIcon = L.divIcon({
  className: 'search-marker',
  html: `<div style="width:36px; height:36px; background:#2563eb; border:4px solid white; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; box-shadow: 0 0 30px rgba(37,99,235,0.6); animation: bounce 1s infinite alternate;"><MapPin size={20}/></div>`,
  iconSize: [36, 36], iconAnchor: [18, 36]
});

const userIcon = L.divIcon({
  className: 'user-pos',
  html: `<div style="position:relative;"><div style="position:absolute; top:-10px; left:-10px; width:36px; height:36px; background:rgba(220,38,38,0.2); border-radius:50%; animation: pulse 2s infinite;"></div><div style="width:16px; height:16px; background:#dc2626; border:3px solid white; border-radius:50%;"></div></div>`,
  iconSize: [16, 16], iconAnchor: [8, 8],
});

// CONTROLADOR DE MOVIMIENTO
function MapController({ center }) {
  const map = useMap();
  useEffect(() => { 
    if (center) map.flyTo(center, 18, { duration: 2, easeLinearity: 0.2 }); 
  }, [center, map]);
  return null;
}

export default function SitesView() {
  const [sites, setSites] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [apiResults, setApiResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null); 
  
  const [selectedNFPA, setSelectedNFPA] = useState('ALL'); 
  const [selectedType, setSelectedType] = useState('ALL'); 
  const [userPos, setUserPos] = useState(null);
  const [mapFocus, setMapFocus] = useState(null);
  const searchTimeout = useRef(null);

  const categories = {
    'NFPA 25': ['BOMBAS', 'HIDRANTES', 'MANGUERAS', 'ROCIADORES', 'VÁLVULAS', 'OBSERVACIONES'],
    'NFPA 72': ['ALARMAS']
  };

  useEffect(() => {
    loadSitesFromDB();
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]));
    }
  }, []);

  const loadSitesFromDB = async () => {
    const all = await db.inspections.toArray();
    setSites(all.filter(ins => ins.location?.lat && ins.location?.lng));
  };

  // --- MOTOR DE BÚSQUEDA TIPO GOOGLE MAPS (NOMINATIM) ---
  const handleTyping = (text) => {
    setSearchTerm(text);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (text.trim().length < 3) {
      setApiResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        // Buscamos cualquier cosa en el mundo, priorizando México
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=6&addressdetails=1&countrycodes=mx`;
        const res = await fetch(url);
        const data = await res.json();
        setApiResults(data);
      } catch (e) {
        console.error("Error en búsqueda:", e);
      } finally {
        setIsSearching(false);
      }
    }, 800);
  };

  const selectPlace = (item, isLocal = false) => {
    if (isLocal) {
      setMapFocus([item.location.lat, item.location.lng]);
      setSearchTerm(item.equipmentName);
      setSelectedLocation(null);
    } else {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      setSelectedLocation({ 
        lat, lon, 
        name: item.display_name.split(',')[0], 
        full_address: item.display_name 
      });
      setMapFocus([lat, lon]);
      setSearchTerm(item.display_name.split(',')[0]);
    }
    setApiResults([]);
  };

  const registerNewClient = async () => {
    if (!selectedLocation) return;
    const loadingToast = toast.loading("Registrando sucursal...");
    try {
      const { error } = await supabase.from('clientes').insert([{ 
        nombre: selectedLocation.name.toUpperCase(), 
        direccion: selectedLocation.full_address,
        latitud: selectedLocation.lat,
        longitud: selectedLocation.lon
      }]);
      if (error) throw error;
      toast.success("Sucursal dada de alta en el sistema", { id: loadingToast });
      setSelectedLocation(null);
      setSearchTerm('');
    } catch (e) { toast.error("Error: " + e.message, { id: loadingToast }); }
  };

  // FILTRADO DE REPORTES PCI
  const filteredSites = useMemo(() => {
    let result = sites;
    if (selectedNFPA !== 'ALL') result = result.filter(s => s.standard === selectedNFPA);
    if (selectedType !== 'ALL') {
      const typeMap = { 'BOMBAS': ['IPM-01', 'IPM-08'], 'MANGUERAS': ['IPM-02'], 'ALARMAS': ['IPM-03'], 'HIDRANTES': ['IPM-04'], 'VÁLVULAS': ['IPM-05'], 'ROCIADORES': ['IPM-06'], 'OBSERVACIONES': ['IPM-07'] };
      result = result.filter(s => typeMap[selectedType]?.includes(s.serviceCode));
    }
    return result;
  }, [sites, selectedNFPA, selectedType]);

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden relative">
      <style>{mapStyles}</style>

      {/* HEADER BUSCADOR INTEGRAL */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[95%] md:w-[600px] z-[10002]">
        <div className="relative">
          <div className="bg-[#111827]/95 backdrop-blur-xl border border-white/10 rounded-3xl px-6 py-4 flex items-center gap-4 shadow-2xl transition-all focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10">
            {isSearching ? <Loader2 className="text-blue-500 animate-spin" size={22}/> : <Search className="text-slate-500" size={22} />}
            <input 
              type="text" 
              placeholder="Buscar plaza, negocio, calle o equipo PCI..."
              className="bg-transparent border-none w-full text-white font-bold text-sm outline-none placeholder:text-slate-500"
              value={searchTerm}
              onChange={(e) => handleTyping(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => {setSearchTerm(''); setApiResults([]); setSelectedLocation(null);}}>
                <X className="text-slate-500 hover:text-white" size={22}/>
              </button>
            )}
          </div>

          {/* LISTADO DE RESULTADOS REALES */}
          {apiResults.length > 0 && (
            <div className="suggestions-container animate-in fade-in zoom-in-95 duration-200">
              <p className="text-[9px] font-black text-slate-500 uppercase px-4 py-2 tracking-widest border-b border-white/5">Resultados de Google Maps</p>
              {apiResults.map((item, i) => (
                <div key={i} className="suggestion-item" onClick={() => selectPlace(item)}>
                  <div className="icon-circle"><MapPin size={18}/></div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate text-white">{item.display_name.split(',')[0]}</span>
                    <span className="text-[10px] text-slate-500 truncate uppercase opacity-70">
                      {item.display_name.split(',').slice(1, 4).join(',')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative w-full h-full">
        <MapContainer center={[20.9673, -89.5925]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
          <MapController center={mapFocus} />
          {userPos && <Marker position={userPos} icon={userIcon} />}

          {/* PIN AZUL DINÁMICO */}
          {selectedLocation && (
            <Marker position={[selectedLocation.lat, selectedLocation.lon]} icon={searchIcon}>
              <Popup>
                <div className="p-4 text-center min-w-[200px] bg-white rounded-xl">
                  <h4 className="font-black text-sm uppercase leading-tight mb-4 text-slate-900 border-b pb-2">{selectedLocation.name}</h4>
                  <button 
                    onClick={registerNewClient} 
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <PlusCircle size={16}/> Registrar Empresa
                  </button>
                </div>
              </Popup>
            </Marker>
          )}

          <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
            {filteredSites.map((site) => (
              <Marker 
                key={site.id} 
                position={[site.location.lat, site.location.lng]}
                icon={L.divIcon({
                  className: 'asset-marker',
                  html: `<div style="width:34px; height:38px; background:${site.overallStatus === 'CRÍTICO' ? '#ef4444' : '#10b981'}; border:3px solid white; border-radius:10px; color:white; display:flex; align-items:center; justify-content:center; font-weight:900; font-size:10px; box-shadow: 0 8px 15px rgba(0,0,0,0.4);">${site.serviceCode.split('-')[1]}</div>`,
                  iconSize: [34, 38]
                })}
              >
                <Popup>
                  <div className="p-3 min-w-[180px]">
                    <div className="flex items-center gap-2 mb-2">
                       <ShieldCheck size={14} className="text-green-500"/>
                       <span className="text-[10px] font-black text-slate-400 uppercase">{site.serviceCode}</span>
                    </div>
                    <h4 className="font-black text-xs uppercase text-slate-900 mb-3">{site.equipmentName}</h4>
                    <button className="bg-slate-900 text-white text-[10px] py-2.5 rounded-xl w-full font-black uppercase flex items-center justify-center gap-2 transition-all hover:bg-red-600" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${site.location.lat},${site.location.lng}`)}>
                      <Navigation2 size={14}/> Iniciar Ruta
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        </MapContainer>

        {/* --- FILTROS PCI (IZQUIERDA) --- */}
        <div className="absolute top-28 left-5 z-[1000] flex flex-col gap-3">
          <div className="bg-[#111827]/90 backdrop-blur-xl border border-white/10 p-2 rounded-3xl shadow-2xl flex flex-col gap-2 w-fit">
            <button onClick={() => { setSelectedNFPA('ALL'); setSelectedType('ALL'); }} className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'ALL' ? 'bg-red-600 text-white shadow-xl' : 'text-slate-500 hover:bg-white/5'}`}><LayoutGrid size={22}/></button>
            <div className="h-[1px] w-8 bg-white/10 mx-auto"></div>
            <button onClick={() => { setSelectedNFPA('NFPA 25'); setSelectedType('ALL'); }} className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'NFPA 25' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-white'}`}><Droplets size={22}/></button>
            <button onClick={() => { setSelectedNFPA('NFPA 72'); setSelectedType('ALL'); }} className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'NFPA 72' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-white'}`}><Bell size={22}/></button>
          </div>

          {selectedNFPA !== 'ALL' && (
            <div className="bg-[#111827]/90 backdrop-blur-xl border border-white/10 p-2.5 rounded-3xl shadow-2xl flex flex-col gap-1.5 animate-in slide-in-from-left duration-300">
              {categories[selectedNFPA].map(cat => (
                <button key={cat} onClick={() => setSelectedType(cat === selectedType ? 'ALL' : cat)} className={`px-4 py-2.5 rounded-xl text-[9px] font-black transition-all ${selectedType === cat ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>{cat}</button>
              ))}
            </div>
          )}
        </div>

        {/* BOTÓN GPS */}
        <div className="absolute bottom-36 right-5 z-[1000]">
          <button onClick={() => userPos && setMapFocus([...userPos])} className="bg-red-600 p-5 rounded-3xl border-4 border-red-400/30 text-white active:scale-90 shadow-2xl transition-all hover:bg-red-500">
            <LocateFixed size={28} />
          </button>
        </div>

        {/* ANALYTICS FOOTER */}
        <div className="absolute bottom-8 left-5 right-5 z-[1000]">
          <div className="bg-[#111827]/95 backdrop-blur-2xl border border-white/10 p-5 rounded-[2.5rem] shadow-2xl max-w-2xl mx-auto flex items-center justify-around">
            <div className="text-center group">
              <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Equipos Activos</span>
              <span className="text-2xl font-black text-white group-hover:text-red-500 transition-colors">{filteredSites.length}</span>
            </div>
            <div className="h-10 w-[1px] bg-white/10"></div>
            <div className="text-center group">
              <span className="block text-[8px] font-black text-red-500 uppercase tracking-widest mb-1">Hallazgos Críticos</span>
              <span className="text-2xl font-black text-red-500">{filteredSites.filter(s => s.overallStatus === 'CRÍTICO').length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}