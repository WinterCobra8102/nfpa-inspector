import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete, InfoWindow, MarkerClusterer } from '@react-google-maps/api';
import { 
  LocateFixed, Search, LayoutGrid, MapPin, 
  Navigation2, Droplets, Bell, ChevronRight, X, Loader2, PlusCircle, ShieldCheck, 
  Activity, Waves, Box, Clipboard, UserPlus, Key, Mail, ClipboardPlus
} from 'lucide-react';
import { db } from '../db';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

const LIBRARIES = ['places'];
const CENTER_MERIDA = { lat: 20.9673, lng: -89.5925 };
const MAP_CONTAINER_STYLE = { width: '100%', height: '100vh' };

const LIGHT_MAP_STYLE = [
  { "featureType": "all", "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#c9d6e3" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#e2e8f0" }] },
  { "featureType": "poi", "elementType": "labels", "stylers": [{ "visibility": "off" }] },
  { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#64748b" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#ffffff" }] }
];

const DARK_MAP_STYLE = [
  { "featureType": "all", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#334155" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "poi", "elementType": "labels", "stylers": [{ "visibility": "off" }] },
  { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#94a3b8" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#0f172a" }] }
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

  // Detectar dark mode para cambiar estilo del mapa
  const isDark = document.documentElement.classList.contains('dark');

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

  if (loadError) return <div className="h-full flex items-center justify-center bg-white dark:bg-slate-950 text-red-600 font-medium">Error al cargar Google Maps</div>;
  if (!isLoaded) return <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400"><Loader2 className="animate-spin text-red-600 mb-4" size={32}/> <span className="text-sm font-medium">Cargando mapa...</span></div>;

  return (
    <div className="h-full w-full relative overflow-hidden bg-slate-50 dark:bg-slate-950">
      <style>{`
        .pac-container { z-index: 99999 !important; border-radius: 12px !important; margin-top: 8px !important; border: 1px solid #e2e8f0 !important; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1) !important; font-family: inherit !important; }
        .pac-item { padding: 12px 16px !important; cursor: pointer !important; font-size: 13px !important; }
        .pac-item:hover { background-color: #f8fafc !important; }
      `}</style>

      {/* BUSCADOR */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[95%] md:w-[480px] z-[2000]">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3 flex items-center gap-3 shadow-lg">
          <Search className="text-slate-400 dark:text-slate-500 shrink-0" size={18} />
          <div className="flex-1">
            <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar sucursal o plaza..." className="bg-transparent border-none w-full text-slate-800 dark:text-slate-200 font-medium text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500" />
            </Autocomplete>
          </div>
          {searchTerm && <button onClick={() => { setSearchTerm(''); setSelectedPlace(null); }}><X className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300" size={16}/></button>}
        </div>
      </div>

      <GoogleMap mapContainerStyle={MAP_CONTAINER_STYLE} center={CENTER_MERIDA} zoom={13} onLoad={setMap} options={{ disableDefaultUI: true, styles: isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE }}>
        
        {selectedPlace && <Marker position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }} icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" />}

        {/* InfoWindow simple - Solo registrar empresa */}
        {selectedPlace && (
          <InfoWindow position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }} onCloseClick={() => setSelectedPlace(null)}>
            <div className="p-4 min-w-[240px] bg-white rounded-lg text-center">
              <h4 className="font-semibold text-sm mb-1 text-slate-800">{selectedPlace.name}</h4>
              <p className="text-xs text-slate-500 mb-4 line-clamp-2">{selectedPlace.address}</p>
              <button onClick={handleRegisterCompany} className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg font-medium text-sm shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <PlusCircle size={16}/> Registrar Empresa
              </button>
            </div>
          </InfoWindow>
        )}

        <MarkerClusterer>
          {(clusterer) => filteredSites.map(site => (
            <Marker key={site.id} position={{ lat: site.lat, lng: site.lng }} clusterer={clusterer} onClick={() => setActiveSite(site)} icon={site.overallStatus === 'CRÍTICO' ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png" : "http://maps.google.com/mapfiles/ms/icons/green-dot.png"} />
          ))}
        </MarkerClusterer>

        {activeSite && (
          <InfoWindow position={{ lat: activeSite.lat, lng: activeSite.lng }} onCloseClick={() => setActiveSite(null)}>
            <div className="p-4 text-center min-w-[200px] space-y-3">
              <div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-md text-white ${activeSite.overallStatus === 'CRÍTICO' ? 'bg-red-500' : 'bg-green-500'}`}>{activeSite.overallStatus}</span>
                <h4 className="font-semibold text-sm text-slate-800 mt-2">{activeSite.name}</h4>
                <p className="text-xs text-slate-400 mt-1">{activeSite.address}</p>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* FILTRO DE INSPECCIONES (izquierda) */}
      <div className="absolute top-24 left-4 z-[1000] flex flex-col gap-3">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-slate-200 dark:border-slate-700 p-1.5 rounded-xl shadow-lg flex flex-col gap-1 w-fit">
          <button onClick={() => setSelectedNFPA('ALL')} className={`p-3 rounded-lg transition-all ${selectedNFPA === 'ALL' ? 'bg-red-600 text-white shadow-md' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><LayoutGrid size={18}/></button>
          <div className="h-[1px] w-6 bg-slate-100 dark:bg-slate-700 mx-auto"></div>
          <button onClick={() => setSelectedNFPA('NFPA 25')} className={`p-3 rounded-lg transition-all ${selectedNFPA === 'NFPA 25' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><Droplets size={18}/></button>
          <button onClick={() => setSelectedNFPA('NFPA 72')} className={`p-3 rounded-lg transition-all ${selectedNFPA === 'NFPA 72' ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}><Bell size={18}/></button>
        </div>
      </div>

      {/* Botón GPS */}
      <div className="absolute bottom-32 right-5 z-[1000]">
        <button onClick={() => userPos && map?.panTo(userPos)} className="bg-red-600 hover:bg-red-700 p-4 rounded-xl border border-red-500/20 text-white active:scale-95 shadow-lg transition-all"><LocateFixed size={22} /></button>
      </div>

      {/* Barra inferior de estadísticas */}
      <div className="absolute bottom-6 left-4 right-4 z-[1000]">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-lg max-w-lg mx-auto flex items-center justify-around">
          <div className="text-center">
            <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Empresas en Radar</span>
            <div className="flex items-center gap-2 justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-2xl font-semibold text-slate-900 dark:text-white">{filteredSites.length}</span>
            </div>
          </div>
          <div className="h-10 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
          <div className="text-center">
            <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Zonas de Riesgo</span>
            <div className="flex items-center gap-2 justify-center">
              <ShieldCheck className="text-red-500" size={16}/>
              <span className="text-2xl font-semibold text-red-600 dark:text-red-500">{filteredSites.filter(s => s.overallStatus === 'CRÍTICO').length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}