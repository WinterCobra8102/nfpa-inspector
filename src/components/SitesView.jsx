import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete, InfoWindow, MarkerClusterer } from '@react-google-maps/api';
import { 
  LocateFixed, Search, LayoutGrid, X, Loader2, PlusCircle, ShieldCheck 
} from 'lucide-react';
import { db } from '../db';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

const LIBRARIES = ['places'];
const CENTER_MERIDA = { lat: 20.9673, lng: -89.5925 };
const MAP_CONTAINER_STYLE = { width: '100%', height: '100vh' };

const DARK_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#1d1d1b" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
];

export default function SitesView({ navigateTo }) { 
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyBveI-_k-o2HEhcY9QkBiGPMgquQQEOsJY",
    libraries: LIBRARIES
  });

  const [map, setMap] = useState(null);
  const [sites, setSites] = useState([]); 
  const [userPos, setUserPos] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [activeSite, setActiveSite] = useState(null);
  const [selectedNFPA, setSelectedNFPA] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

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
      const allCompanies = await db.clientes.toArray();
      const standardizedSites = allCompanies.map(c => ({
        id: c.id,
        name: c.nombre,
        address: c.direccion,
        lat: parseFloat(c.latitud || c.location?.lat),
        lng: parseFloat(c.longitud || c.location?.lng),
        overallStatus: c.overallStatus || 'ÓPTIMO', 
        standard: c.standard || 'ALL'
      })).filter(s => !isNaN(s.lat) && !isNaN(s.lng));
      setSites(standardizedSites);
    } catch (e) {
      console.error("Error cargando directorio:", e);
    }
  };

  const onAutocompleteLoad = useCallback((auto) => { setAutocomplete(auto); }, []);

  const onPlaceChanged = () => {
    if (!autocomplete) return;
    const place = autocomplete.getPlace();
    if (!place || !place.geometry || !place.geometry.location) {
      toast.error("Selecciona un lugar de la lista de Google.");
      return;
    }
    const newPos = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      name: place.name || "Ubicación Seleccionada",
      address: place.formatted_address || "Sin dirección"
    };
    setSelectedPlace(newPos);
    setActiveSite(null);
    if (map) { map.panTo(newPos); map.setZoom(17); }
  };

  // ==================== SOLO REGISTRA LA EMPRESA ====================
  const handleRegisterCompany = async () => {
    if (!selectedPlace) return;

    const loading = toast.loading("Registrando empresa...");

    try {
      const companyId = crypto.randomUUID();

      const { error } = await supabase.from('clientes').insert([{
        id: companyId,
        nombre: selectedPlace.name.toUpperCase(),
        direccion: selectedPlace.address,
        latitud: selectedPlace.lat,
        longitud: selectedPlace.lng
      }]);

      if (error) throw error;

      await db.clientes.put({
        id: companyId,
        nombre: selectedPlace.name.toUpperCase(),
        direccion: selectedPlace.address,
        latitud: selectedPlace.lat,
        longitud: selectedPlace.lng
      });

      toast.success("Empresa registrada con éxito", { id: loading });
      setSelectedPlace(null);
      loadSitesFromDB();

    } catch (e) {
      toast.error(e.message, { id: loading });
    }
  };
  // ============================================================

  const filteredSites = useMemo(() => {
    let result = sites;
    if (selectedNFPA !== 'ALL') result = result.filter(s => s.standard === selectedNFPA);
    if (searchTerm.trim() !== '') {
      result = result.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return result;
  }, [sites, selectedNFPA, searchTerm]);

  if (loadError) return <div className="h-full flex items-center justify-center bg-black text-red-500 font-black">ERROR AL CARGAR MAPS</div>;
  if (!isLoaded) return <div className="h-full flex flex-col items-center justify-center bg-slate-950 text-white font-black"><Loader2 className="animate-spin text-red-600 mb-4" size={40}/> INICIANDO RADAR...</div>;

  return (
    <div className="h-full w-full relative overflow-hidden bg-[#111]">
      <style>{`
        .pac-container { z-index: 99999 !important; border-radius: 16px !important; margin-top: 8px !important; border: none !important; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8) !important; font-family: inherit !important; }
        .pac-item { padding: 12px 16px !important; cursor: pointer !important; font-size: 13px !important; }
        .pac-item:hover { background-color: #f1f5f9 !important; }
      `}</style>

      {/* BUSCADOR */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[95%] md:w-[500px] z-[2000]">
        <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-3xl px-6 py-4 flex items-center gap-4 shadow-2xl">
          <Search className="text-slate-500 shrink-0" size={22} />
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
            <button onClick={() => { setSearchTerm(''); setSelectedPlace(null); }}>
              <X className="text-slate-500 hover:text-white" size={18}/>
            </button>
          )}
        </div>
      </div>

      <GoogleMap mapContainerStyle={MAP_CONTAINER_STYLE} center={CENTER_MERIDA} zoom={13} onLoad={setMap} options={{ disableDefaultUI: true, styles: DARK_MAP_STYLE }}>
        
        {selectedPlace && <Marker position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }} icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" />}

        {/* InfoWindow simplificado - Solo botón de registrar empresa */}
        {selectedPlace && (
          <InfoWindow position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }} onCloseClick={() => setSelectedPlace(null)}>
            <div className="p-5 min-w-[260px] bg-white rounded-2xl text-center">
              <h4 className="font-black text-sm uppercase mb-1 text-slate-800">{selectedPlace.name}</h4>
              <p className="text-[10px] text-slate-500 mb-4 line-clamp-2">{selectedPlace.address}</p>
              
              <button 
                onClick={handleRegisterCompany}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <PlusCircle size={16}/> REGISTRAR EMPRESA
              </button>
            </div>
          </InfoWindow>
        )}

        <MarkerClusterer>
          {(clusterer) => filteredSites.map(site => (
            <Marker 
              key={site.id} 
              position={{ lat: site.lat, lng: site.lng }} 
              clusterer={clusterer} 
              onClick={() => setActiveSite(site)} 
              icon={site.overallStatus === 'CRÍTICO' ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png" : "http://maps.google.com/mapfiles/ms/icons/green-dot.png"} 
            />
          ))}
        </MarkerClusterer>

        {activeSite && (
          <InfoWindow position={{ lat: activeSite.lat, lng: activeSite.lng }} onCloseClick={() => setActiveSite(null)}>
            <div className="p-3 text-center min-w-[200px] space-y-3">
              <div>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full text-white ${activeSite.overallStatus === 'CRÍTICO' ? 'bg-red-500' : 'bg-green-500'}`}>
                  {activeSite.overallStatus}
                </span>
                <h4 className="font-black text-xs uppercase text-slate-800 mt-2">{activeSite.name}</h4>
                <p className="text-[8px] text-slate-400 mt-1">{activeSite.address}</p>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <button 
                  className="w-full bg-red-600 hover:bg-red-700 text-white text-[9px] py-2.5 rounded-lg font-black uppercase flex items-center justify-center gap-2" 
                  onClick={() => navigateTo && navigateTo('form', { clientId: activeSite.id, clientName: activeSite.name })}
                >
                  Crear Inspección
                </button>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Botones de filtro NFPA */}
      <div className="absolute top-28 left-5 z-[1000] flex flex-col gap-4">
        <div className="bg-[#111827]/90 backdrop-blur-xl border border-white/10 p-2 rounded-3xl shadow-2xl flex flex-col gap-2 w-fit">
          <button onClick={() => setSelectedNFPA('ALL')} className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'ALL' ? 'bg-red-600 text-white' : 'text-slate-500 hover:bg-white/5'}`}><LayoutGrid size={22}/></button>
          <div className="h-[1px] w-8 bg-white/10 mx-auto"></div>
          <button onClick={() => setSelectedNFPA('NFPA 25')} className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'NFPA 25' ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-white'}`}><Droplets size={22}/></button>
          <button onClick={() => setSelectedNFPA('NFPA 72')} className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'NFPA 72' ? 'bg-white text-slate-900' : 'text-slate-500 hover:text-white'}`}><Bell size={22}/></button>
        </div>
      </div>

      <div className="absolute bottom-36 right-6 z-[1000]">
        <button onClick={() => userPos && map?.panTo(userPos)} className="bg-red-600 p-5 rounded-3xl border-4 border-red-400/30 text-white active:scale-90 shadow-2xl hover:bg-red-500">
          <LocateFixed size={28} />
        </button>
      </div>

      <div className="absolute bottom-8 left-5 right-5 z-[1000]">
        <div className="bg-[#111827]/95 backdrop-blur-2xl border border-white/10 p-5 rounded-[2.5rem] shadow-2xl max-w-2xl mx-auto flex items-center justify-around">
          <div className="text-center">
            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Empresas en Radar</span>
            <div className="flex items-center gap-2 justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-3xl font-black text-white">{filteredSites.length}</span>
            </div>
          </div>
          <div className="h-12 w-[1px] bg-white/10"></div>
          <div className="text-center">
            <span className="block text-[8px] font-black text-red-500/50 uppercase tracking-[0.2em] mb-1">Zonas de Riesgo</span>
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