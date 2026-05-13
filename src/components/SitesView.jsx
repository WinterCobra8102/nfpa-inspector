import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete, InfoWindow } from '@react-google-maps/api';
import { 
  LocateFixed, Search, LayoutGrid, MapPin, 
  Navigation2, Droplets, Bell, ChevronRight, X, Loader2, PlusCircle, ShieldCheck, 
  Activity, Waves, Box, Clipboard, UserPlus, Key, Mail
} from 'lucide-react';
import { db } from '../db';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

// --- CONFIGURACIÓN CRÍTICA ---
const LIBRARIES = ['places'];
const CENTER_MERIDA = { lat: 20.9673, lng: -89.5925 };
const MAP_CONTAINER_STYLE = { width: '100%', height: '100vh' };

const DARK_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#1d1d1b" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

export default function SitesView() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyBveI-_k-o2HEhcY9QkBiGPMgquQQEOsJY",
    libraries: LIBRARIES
  });

  // --- ESTADOS ---
  const [map, setMap] = useState(null);
  const [sites, setSites] = useState([]);
  const [userPos, setUserPos] = useState(null);
  
  const [autocomplete, setAutocomplete] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [activeSite, setActiveSite] = useState(null);
  
  const [showManagerForm, setShowManagerForm] = useState(false);
  const [managerData, setManagerData] = useState({ name: '', email: '', pass: '' });

  const [selectedNFPA, setSelectedNFPA] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // --- CARGA DE DATOS ---
  useEffect(() => {
    loadSitesFromDB();
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log("GPS no disponible", err)
      );
    }
  }, []);

  const loadSitesFromDB = async () => {
    try {
      const all = await db.inspections.toArray();
      setSites(all.filter(ins => ins.location?.lat && ins.location?.lng));
    } catch (e) {
      console.error("Error DB:", e);
    }
  };

  // --- BUSCADOR BLINDADO (SOLUCIÓN AL PANTALLAZO BLANCO) ---
  const onAutocompleteLoad = useCallback((auto) => {
    setAutocomplete(auto);
  }, []);

  const onPlaceChanged = () => {
    if (!autocomplete) return;
    
    const place = autocomplete.getPlace();
    
    // GUARDIA DE SEGURIDAD: Evita el crash si el lugar no existe
    if (!place || !place.geometry || !place.geometry.location) {
      toast.error("Selecciona un lugar de la lista de Google.");
      return;
    }

    try {
      const newPos = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        name: place.name || "Ubicación Seleccionada",
        address: place.formatted_address || "Sin dirección"
      };

      setSelectedPlace(newPos);
      setShowManagerForm(false);
      setActiveSite(null);
      
      if (map) {
        map.panTo(newPos);
        map.setZoom(17);
      }
    } catch (err) {
      console.error("Error al mover el mapa:", err);
    }
  };

  // --- REGISTRO DE EMPRESA Y JEFE ---
  const handleFinalRegistration = async () => {
    if (!managerData.name || !managerData.email) {
      toast.error("Nombre y Email del Jefe son obligatorios");
      return;
    }

    const loading = toast.loading("Registrando empresa y accesos...");
    try {
      const { data: newClient, error: clientError } = await supabase
        .from('clientes')
        .insert([{
          nombre: selectedPlace.name.toUpperCase(),
          direccion: selectedPlace.address,
          latitud: selectedPlace.lat,
          longitud: selectedPlace.lng,
          encargado_nombre: managerData.name,
          encargado_email: managerData.email
        }])
        .select().single();

      if (clientError) throw clientError;

      if (managerData.pass) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('email', managerData.email).single();
        if (profile) {
          await supabase.rpc('admin_update_user', { target_user_id: profile.id, new_password: managerData.pass });
          await supabase.from('profiles').update({ client_id: newClient.id, role: 'MANAGER' }).eq('id', profile.id);
        }
      }

      toast.success("Empresa y Jefe legalizados en TLETL", { id: loading });
      setSelectedPlace(null);
      setManagerData({ name: '', email: '', pass: '' });
      setShowManagerForm(false);
    } catch (e) {
      toast.error(e.message, { id: loading });
    }
  };

  const filteredSites = useMemo(() => {
    let result = sites;
    if (selectedNFPA !== 'ALL') result = result.filter(s => s.standard === selectedNFPA);
    if (searchTerm.trim() !== '') {
      result = result.filter(s => s.equipmentName?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return result;
  }, [sites, selectedNFPA, searchTerm]);

  // --- RENDERS DE CARGA ---
  if (loadError) return <div className="h-full flex items-center justify-center bg-black text-red-500 font-black">ERROR AL CARGAR MAPS</div>;
  if (!isLoaded) return <div className="h-full flex flex-col items-center justify-center bg-slate-950 text-white font-black"><Loader2 className="animate-spin text-red-600 mb-4" size={40}/> INICIANDO RADAR...</div>;

  return (
    <div className="h-full w-full relative overflow-hidden bg-[#111]">
      
      {/* CORRECCIÓN DE Z-INDEX PARA RESULTADOS DE GOOGLE */}
      <style>{`
        .pac-container {
          z-index: 99999 !important;
          border-radius: 16px !important;
          margin-top: 8px !important;
          border: none !important;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8) !important;
          font-family: inherit !important;
        }
        .pac-item {
          padding: 12px 16px !important;
          cursor: pointer !important;
          font-size: 13px !important;
        }
        .pac-item:hover {
          background-color: #f1f5f9 !important;
        }
      `}</style>

      {/* 1. BUSCADOR SUPERIOR (ESTRUCTURA CORREGIDA) */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[95%] md:w-[500px] z-[2000]">
        <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-3xl px-6 py-4 flex items-center gap-4 shadow-2xl focus-within:ring-4 focus-within:ring-blue-500/20 transition-all">
          <Search className="text-slate-500 shrink-0" size={22} />
          
          {/* El Autocomplete AHORA SÍ envuelve únicamente al input */}
          <div className="flex-1">
            <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar sucursal o plaza..." 
                className="bg-transparent border-none w-full text-white font-bold text-sm outline-none placeholder:text-slate-600" 
              />
            </Autocomplete>
          </div>

          {searchTerm && (
            <button onClick={() => { setSearchTerm(''); setSelectedPlace(null); }} className="shrink-0">
              <X className="text-slate-500 hover:text-white" size={18}/>
            </button>
          )}
        </div>
      </div>

      {/* 2. MAPA GOOGLE */}
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={CENTER_MERIDA}
        zoom={13}
        onLoad={setMap}
        options={{
          disableDefaultUI: true,
          styles: DARK_MAP_STYLE
        }}
      >
        {/* Pin Azul de Búsqueda */}
        {selectedPlace && (
          <Marker 
            position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }} 
            icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
          />
        )}

        {/* Ventana de Registro (Separada del Marker para evitar crashes) */}
        {selectedPlace && (
          <InfoWindow 
            position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }} 
            onCloseClick={() => { setSelectedPlace(null); setShowManagerForm(false); }}
          >
            <div className="p-4 min-w-[260px] bg-white rounded-xl shadow-none">
              {!showManagerForm ? (
                <div className="text-center">
                  <h4 className="font-black text-xs uppercase mb-3 text-slate-800 leading-tight border-b pb-2">{selectedPlace.name}</h4>
                  <button 
                    onClick={() => setShowManagerForm(true)}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <PlusCircle size={16}/> Registrar Empresa
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest text-center border-b pb-2">Asignar Jefe de Sucursal</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                      <UserPlus size={14} className="text-slate-400"/>
                      <input placeholder="Nombre Completo" className="bg-transparent text-[10px] font-bold outline-none w-full text-slate-700" value={managerData.name} onChange={e => setManagerData({...managerData, name: e.target.value})} />
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                      <Mail size={14} className="text-slate-400"/>
                      <input placeholder="Email del Jefe" className="bg-transparent text-[10px] font-bold outline-none w-full text-slate-700" value={managerData.email} onChange={e => setManagerData({...managerData, email: e.target.value})} />
                    </div>
                    <div className="flex items-center gap-2 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                      <Key size={14} className="text-slate-400"/>
                      <input type="password" placeholder="Pass Temporal" className="bg-transparent text-[10px] font-bold outline-none w-full text-slate-700" value={managerData.pass} onChange={e => setManagerData({...managerData, pass: e.target.value})} />
                    </div>
                  </div>
                  <button onClick={handleFinalRegistration} className="w-full bg-red-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-xl mt-2 active:scale-95 transition-all">Guardar y Vincular</button>
                  <button onClick={() => setShowManagerForm(false)} className="w-full text-slate-400 font-bold text-[8px] uppercase">Cancelar</button>
                </div>
              )}
            </div>
          </InfoWindow>
        )}

        {/* Pines PCI Guardados (Iconos de Google seguros) */}
        {filteredSites.map(site => (
          <Marker 
            key={site.id} 
            position={{ lat: site.location.lat, lng: site.location.lng }} 
            onClick={() => setActiveSite(site)}
            icon={site.overallStatus === 'CRÍTICO' 
              ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png" 
              : "http://maps.google.com/mapfiles/ms/icons/green-dot.png"}
          />
        ))}

        {/* Ventana de Pines Guardados */}
        {activeSite && (
          <InfoWindow 
            position={{ lat: activeSite.location.lat, lng: activeSite.location.lng }} 
            onCloseClick={() => setActiveSite(null)}
          >
            <div className="p-2 text-center">
              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full text-white ${activeSite.overallStatus === 'CRÍTICO' ? 'bg-red-500' : 'bg-green-500'}`}>{activeSite.overallStatus}</span>
              <h4 className="font-black text-[10px] uppercase text-slate-800 mt-2">{activeSite.equipmentName}</h4>
              <button className="w-full bg-slate-900 text-white text-[8px] py-2 mt-2 rounded-lg font-black uppercase" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeSite.location.lat},${activeSite.location.lng}`)}>Ir a Google Maps</button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* 3. FILTROS TÉCNICOS */}
      <div className="absolute top-28 left-5 z-[1000] flex flex-col gap-4">
        <div className="bg-[#111827]/90 backdrop-blur-xl border border-white/10 p-2 rounded-3xl shadow-2xl flex flex-col gap-2 w-fit">
          <button onClick={() => setSelectedNFPA('ALL')} className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'ALL' ? 'bg-red-600 text-white shadow-xl' : 'text-slate-500 hover:bg-white/5'}`}><LayoutGrid size={22}/></button>
          <div className="h-[1px] w-8 bg-white/10 mx-auto"></div>
          <button onClick={() => setSelectedNFPA('NFPA 25')} className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'NFPA 25' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-white'}`}><Droplets size={22}/></button>
          <button onClick={() => setSelectedNFPA('NFPA 72')} className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'NFPA 72' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-white'}`}><Bell size={22}/></button>
        </div>
      </div>

      {/* 4. BOTÓN GPS */}
      <div className="absolute bottom-36 right-6 z-[1000]">
        <button onClick={() => userPos && map?.panTo(userPos)} className="bg-red-600 p-5 rounded-3xl border-4 border-red-400/30 text-white active:scale-90 shadow-2xl transition-all hover:bg-red-500">
          <LocateFixed size={28} />
        </button>
      </div>

      {/* 5. ANALYTICS FOOTER */}
      <div className="absolute bottom-8 left-5 right-5 z-[1000]">
        <div className="bg-[#111827]/95 backdrop-blur-2xl border border-white/10 p-5 rounded-[2.5rem] shadow-2xl max-w-2xl mx-auto flex items-center justify-around overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>
          <div className="text-center group">
            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Equipos Radar</span>
            <div className="flex items-center gap-2 justify-center">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-3xl font-black text-white">{filteredSites.length}</span>
            </div>
          </div>
          <div className="h-12 w-[1px] bg-white/10"></div>
          <div className="text-center group">
            <span className="block text-[8px] font-black text-red-500/50 uppercase tracking-[0.2em] mb-1">Equipos Críticos</span>
            <div className="flex items-center gap-2 justify-center">
               <ShieldCheck className="text-red-500" size={18}/>
               <span className="text-3xl font-black text-red-500">{filteredSites.filter(s => s.overallStatus === 'CRÍTICO').length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}