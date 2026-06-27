import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete, InfoWindow, MarkerClusterer } from '@react-google-maps/api';
import { 
  LocateFixed, Search, LayoutGrid, MapPin, 
  X, Loader2, PlusCircle, ShieldCheck, Save, Building2
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

// Añadimos currentUser a los props para poder leer su región (tenant_id)
export default function SitesView({ navigateTo, currentUser }) { 
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
  const [searchTerm, setSearchTerm] = useState('');

  // ESTADO PARA EL MODAL DE REGISTRO MANUAL
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualForm, setManualForm] = useState({ name: '', address: '' });

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
    setShowManualForm(false);
    if (map) { map.panTo(newPos); map.setZoom(17); }
  };

  const handleRegisterCompany = async () => {
    if (!selectedPlace) return;
    await performRegistration(selectedPlace.name, selectedPlace.address, selectedPlace.lat, selectedPlace.lng);
    setSelectedPlace(null);
  };

  const openManualForm = () => {
    setManualForm({ name: '', address: '' });
    setShowManualForm(true);
    setSelectedPlace(null);
    setActiveSite(null);
  };

  // ==================== GEOCODIFICACIÓN INVISIBLE (De texto a coordenadas) ====================
  const handleManualRegister = async () => {
    if (!manualForm.name.trim()) {
      toast.error("El nombre de la empresa es obligatorio");
      return;
    }
    if (!manualForm.address.trim()) {
      toast.error("Debes escribir una dirección para que Google la encuentre.");
      return;
    }

    const loadingToast = toast.loading("Buscando dirección y registrando...");

    try {
      const geocoder = new window.google.maps.Geocoder();
      
      geocoder.geocode({ address: manualForm.address }, async (results, status) => {
        if (status === 'OK' && results[0]) {
          const foundLat = results[0].geometry.location.lat();
          const foundLng = results[0].geometry.location.lng();
          const formattedAddress = results[0].formatted_address; 

          toast.dismiss(loadingToast);
          await performRegistration(manualForm.name, formattedAddress, foundLat, foundLng);
          
          setShowManualForm(false);
          if (map) { map.panTo({ lat: foundLat, lng: foundLng }); map.setZoom(17); }

        } else {
          toast.error("No se encontró esa dirección en el mapa. Sé más específico (ej. Calle 60 #123, Mérida).", { id: loadingToast });
        }
      });
      
    } catch (e) {
      toast.error("Error al conectar con Google Maps.", { id: loadingToast });
    }
  };

  const performRegistration = async (name, address, lat, lng) => {
    const loading = toast.loading("Guardando en la base de datos...");
    try {
      const companyId = crypto.randomUUID();

      // --- AQUÍ APLICAMOS LA LÓGICA SAAS MULTI-TENANT ---
      const tenantId = currentUser?.tenant_id || null;

      const { error } = await supabase.from('clientes').insert([{
        id: companyId,
        nombre: name.toUpperCase(),
        direccion: address,
        latitud: lat,
        longitud: lng,
        tenant_id: tenantId // Vinculamos la empresa al estado/franquicia actual
      }]);

      if (error) throw error;

      await db.clientes.put({
        id: companyId,
        nombre: name.toUpperCase(),
        direccion: address,
        latitud: lat,
        longitud: lng,
        tenant_id: tenantId // También lo guardamos localmente en Dexie
      });

      toast.success("Empresa registrada con éxito", { id: loading });
      loadSitesFromDB();
    } catch (e) {
      toast.error(e.message, { id: loading });
    }
  };

  const filteredSites = useMemo(() => {
    let result = sites;
    if (searchTerm.trim() !== '') {
      result = result.filter(s => s.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return result;
  }, [sites, searchTerm]);

  if (loadError) return <div className="h-full flex items-center justify-center bg-white dark:bg-slate-950 text-red-600 font-medium">Error al cargar Google Maps</div>;
  if (!isLoaded) return <div className="h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400"><Loader2 className="animate-spin text-red-600 mb-4" size={32}/> <span className="text-sm font-medium">Cargando mapa...</span></div>;

  return (
    <div className="h-full w-full relative overflow-hidden bg-slate-50 dark:bg-slate-950">
      <style>{`
        .pac-container { z-index: 99999 !important; border-radius: 12px !important; margin-top: 8px !important; border: 1px solid #e2e8f0 !important; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1) !important; font-family: inherit !important; }
        .pac-item { padding: 12px 16px !important; cursor: pointer !important; font-size: 13px !important; }
        .pac-item:hover { background-color: #f8fafc !important; }
      `}</style>

      {/* ÁREA DE BÚSQUEDA Y BOTÓN MANUAL CENTRAL */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[95%] md:w-[480px] z-[2000] space-y-2 pointer-events-none">
        
        {/* Input Buscador Google */}
        <div className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-slate-200 dark:border-slate-700 rounded-xl px-5 py-3 flex items-center gap-3 shadow-lg pointer-events-auto transition-opacity ${showManualForm ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <Search className="text-slate-400 dark:text-slate-500 shrink-0" size={18} />
          <div className="flex-1">
            <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar sucursal o plaza en el mapa..." className="bg-transparent border-none w-full text-slate-800 dark:text-slate-200 font-medium text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500" />
            </Autocomplete>
          </div>
          {searchTerm && <button onClick={() => { setSearchTerm(''); setSelectedPlace(null); }}><X className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300" size={16}/></button>}
        </div>

        {/* Botón de Registro Manual explícito */}
        <button 
          onClick={openManualForm}
          className={`w-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all pointer-events-auto ${showManualForm ? 'hidden' : 'block'}`}
        >
          <Building2 size={16} /> ¿No encuentras la empresa? Añádela manualmente
        </button>

      </div>

      <GoogleMap 
        mapContainerStyle={MAP_CONTAINER_STYLE} 
        center={CENTER_MERIDA} 
        zoom={13} 
        onLoad={setMap} 
        options={{ 
          disableDefaultUI: true, 
          styles: isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE,
          gestureHandling: "greedy" // Permite mover el mapa con 1 dedo
        }}
      >
        
        {/* MARCADOR DE BÚSQUEDA GOOGLE */}
        {selectedPlace && <Marker position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }} icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png" />}
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

        {/* EMPRESAS REGISTRADAS */}
        <MarkerClusterer>
          {(clusterer) => filteredSites.map(site => (
            <Marker key={site.id} position={{ lat: site.lat, lng: site.lng }} clusterer={clusterer} onClick={() => setActiveSite(site)} icon={site.overallStatus === 'CRÍTICO' ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png" : "http://maps.google.com/mapfiles/ms/icons/green-dot.png"} />
          ))}
        </MarkerClusterer>

        {activeSite && !showManualForm && (
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

      {/* BOTÓN VISTA DE LISTA */}
      <div className={`absolute top-5 left-4 z-[1000] flex flex-col gap-3 transition-opacity ${showManualForm ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-slate-200 dark:border-slate-700 p-1.5 rounded-xl shadow-lg flex flex-col gap-1 w-fit">
          <button onClick={() => navigateTo('companies')} title="Ver Lista de Empresas" className="p-3 rounded-lg transition-all text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700">
            <LayoutGrid size={18}/>
          </button>
        </div>
      </div>

      {/* TARJETA FLOTANTE DE REGISTRO MANUAL CON AUTO-UBICACIÓN */}
      {showManualForm && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[3000] w-[90%] md:w-[400px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-10">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-semibold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <MapPin size={18} className="text-red-600" /> Registro Manual
            </h3>
            <button onClick={() => setShowManualForm(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20}/></button>
          </div>
          
          <div className="space-y-4">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              Escribe la <span className="font-bold text-red-500">calle exacta</span>. El sistema calculará las coordenadas de forma automática.
            </p>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Nombre Sucursal <span className="text-red-500">*</span></label>
              <input 
                type="text" autoFocus placeholder="Ej: Bodega TLETL Norte" 
                className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                value={manualForm.name} onChange={(e) => setManualForm({...manualForm, name: e.target.value})}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dirección para Buscar <span className="text-red-500">*</span></label>
              <textarea 
                rows="2"
                placeholder="Ej. Calle 60 #123, Mérida..." 
                className="w-full mt-1 p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none transition-colors"
                value={manualForm.address} onChange={(e) => setManualForm({...manualForm, address: e.target.value})}
              />
            </div>
            
            <div className="pt-2">
              <button onClick={handleManualRegister} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-sm shadow-md shadow-red-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <Save size={18}/> Guardar Empresa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Botón GPS */}
      <div className={`absolute bottom-32 right-5 z-[1000] transition-opacity ${showManualForm ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <button onClick={() => userPos && map?.panTo(userPos)} className="bg-red-600 hover:bg-red-700 p-4 rounded-xl border border-red-500/20 text-white active:scale-95 shadow-lg transition-all"><LocateFixed size={22} /></button>
      </div>

      {/* Barra inferior de estadísticas */}
      <div className={`absolute bottom-6 left-4 right-4 z-[1000] transition-opacity ${showManualForm ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
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