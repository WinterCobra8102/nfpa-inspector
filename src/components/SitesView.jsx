import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete, InfoWindow } from '@react-google-maps/api';
import { 
  LocateFixed, Search, LayoutGrid, MapPin, 
  Navigation2, Droplets, Bell, ChevronRight, X, Loader2, PlusCircle, ShieldCheck, Filter, Activity, Zap, Waves, Clipboard, Box
} from 'lucide-react';
import { db } from '../db';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

// --- CONFIGURACIÓN Y ESTILOS ---
const containerStyle = { width: '100%', height: '100vh' };
const centerMerida = { lat: 20.9673, lng: -89.5925 };
const libraries = ['places'];

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  styles: [
    { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
    { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
    { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#3c3c3c" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
  ]
};

export default function SitesView() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyBveI-_k-o2HEhcY9QkBiGPMgquQQEOsJY",
    libraries
  });

  // --- ESTADOS ---
  const [map, setMap] = useState(null);
  const [sites, setSites] = useState([]);
  const [userPos, setUserPos] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null); // Para búsqueda global
  const [activeSite, setActiveSite] = useState(null); // Para InfoWindow de pines existentes
  
  // Filtros Técnicos
  const [selectedNFPA, setSelectedNFPA] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = {
    'NFPA 25': [
      { id: 'BOMBAS', icon: <Activity size={14}/> },
      { id: 'HIDRANTES', icon: <Waves size={14}/> },
      { id: 'MANGUERAS', icon: <Box size={14}/> },
      { id: 'ROCIADORES', icon: <Droplets size={14}/> },
      { id: 'VÁLVULAS', icon: <ShieldCheck size={14}/> },
      { id: 'OBSERVACIONES', icon: <Clipboard size={14}/> }
    ],
    'NFPA 72': [
      { id: 'ALARMAS', icon: <Bell size={14}/> }
    ]
  };

  // --- EFECTOS ---
  useEffect(() => {
    loadSitesFromDB();
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  }, []);

  const loadSitesFromDB = async () => {
    const all = await db.inspections.toArray();
    // Filtramos solo los que tienen ubicación válida
    const validSites = all.filter(ins => ins.location?.lat && ins.location?.lng);
    setSites(validSites);
  };

  // --- LÓGICA DE BÚSQUEDA ---
  const onAutocompleteLoad = (auto) => setAutocomplete(auto);

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) {
        toast.error("Selecciona una ubicación de la lista");
        return;
      }

      const newPos = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        name: place.name,
        address: place.formatted_address
      };

      setSelectedPlace(newPos);
      setActiveSite(null); // Cerramos cualquier otro popup
      
      if (map) {
        map.panTo(newPos);
        map.setZoom(17);
      }
    }
  };

  const registerNewClient = async () => {
    if (!selectedPlace) return;
    const loadingToast = toast.loading("Registrando en TLETL...");
    try {
      const { error } = await supabase.from('clientes').insert([{
        nombre: selectedPlace.name.toUpperCase(),
        direccion: selectedPlace.address,
        latitud: selectedPlace.lat,
        longitud: selectedPlace.lng
      }]);
      if (error) throw error;
      toast.success("Empresa añadida al portafolio", { id: loadingToast });
      setSelectedPlace(null);
    } catch (e) {
      toast.error(e.message, { id: loadingToast });
    }
  };

  // --- FILTRADO PCI COMPLEJO ---
  const filteredSites = useMemo(() => {
    let result = sites;

    // Filtro por Norma
    if (selectedNFPA !== 'ALL') {
      result = result.filter(s => s.standard === selectedNFPA);
    }

    // Filtro por Sub-categoría Técnica
    if (selectedType !== 'ALL') {
      const typeMap = { 
        'BOMBAS': ['IPM-01-D', 'IPM-01-E', 'IPM-01'], 
        'HIDRANTES': ['IPM-04'], 
        'ALARMAS': ['IPM-03'], 
        'OBSERVACIONES': ['IPM-07'],
        'MANGUERAS': ['IPM-02'],
        'ROCIADORES': ['IPM-06'],
        'VÁLVULAS': ['IPM-05']
      };
      result = result.filter(s => typeMap[selectedType]?.includes(s.serviceCode));
    }

    // Filtro por nombre de equipo (Buscador manual)
    if (searchTerm.trim() !== '') {
      result = result.filter(s => 
        s.equipmentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.serviceCode?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return result;
  }, [sites, selectedNFPA, selectedType, searchTerm]);

  // --- RENDERS ---
  if (loadError) return <div className="h-full flex items-center justify-center bg-slate-900 text-red-500 font-black uppercase">Error al cargar Google Maps</div>;
  if (!isLoaded) return <div className="h-full flex flex-col items-center justify-center bg-slate-950 text-white font-black uppercase gap-4"><Loader2 className="animate-spin text-red-600" size={40}/> Cargando Radar TLETL...</div>;

  return (
    <div className="h-full w-full relative overflow-hidden bg-slate-900">
      
      {/* 1. BARRA DE BÚSQUEDA SUPERIOR (GOOGLE AUTOCOMPLETE) */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[95%] md:w-[500px] z-[1000]">
        <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
          <div className="bg-[#111827]/95 backdrop-blur-xl border border-white/10 rounded-3xl px-6 py-4 flex items-center gap-4 shadow-2xl transition-all focus-within:ring-4 focus-within:ring-blue-500/20">
            <Search className="text-slate-500" size={22} />
            <input 
              type="text" 
              placeholder="Buscar plaza, negocio o equipo PCI..."
              className="bg-transparent border-none w-full text-white font-bold text-sm outline-none placeholder:text-slate-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => {setSearchTerm(''); setSelectedPlace(null);}} className="text-slate-500 hover:text-white">
                <X size={20}/>
              </button>
            )}
          </div>
        </Autocomplete>
      </div>

      {/* 2. MAPA PRINCIPAL */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={centerMerida}
        zoom={13}
        onLoad={m => setMap(m)}
        options={mapOptions}
        onClick={() => { setActiveSite(null); setSelectedPlace(null); }}
      >
        {/* Marcador de Usuario */}
        {userPos && (
          <Marker 
            position={userPos} 
            icon={{
              url: "https://maps.google.com/mapfiles/ms/icons/red-pushpin.png",
              scaledSize: new window.google.maps.Size(40, 40)
            }}
          />
        )}

        {/* Marcador de Búsqueda Global (Pin Azul) */}
        {selectedPlace && (
          <Marker 
            position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
            icon={{
              url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
              scaledSize: new window.google.maps.Size(40, 40)
            }}
          >
            <InfoWindow position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }} onCloseClick={() => setSelectedPlace(null)}>
              <div className="p-2 text-center min-w-[160px]">
                <h4 className="font-black text-xs uppercase mb-3 text-slate-800 leading-tight">{selectedPlace.name}</h4>
                <button 
                  onClick={registerNewClient} 
                  className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-black text-[9px] uppercase shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                >
                  <PlusCircle size={14}/> Registrar Empresa
                </button>
              </div>
            </InfoWindow>
          </Marker>
        )}

        {/* Marcadores de Equipos TLETL (Pines con colores por estatus) */}
        {filteredSites.map(site => (
          <Marker 
            key={site.id}
            position={{ lat: site.location.lat, lng: site.location.lng }}
            onClick={() => setActiveSite(site)}
            icon={{
              url: site.overallStatus === 'CRÍTICO' 
                ? "https://maps.google.com/mapfiles/ms/icons/orange-dot.png" 
                : "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
              scaledSize: new window.google.maps.Size(35, 35)
            }}
            label={{
              text: site.serviceCode.split('-')[1] || 'PCI',
              color: 'white',
              fontSize: '10px',
              fontWeight: 'bold'
            }}
          />
        ))}

        {/* InfoWindow para Sites Existentes */}
        {activeSite && (
          <InfoWindow 
            position={{ lat: activeSite.location.lat, lng: activeSite.location.lng }}
            onCloseClick={() => setActiveSite(null)}
          >
            <div className="p-3 min-w-[180px] bg-white">
              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full text-white mb-1 inline-block ${activeSite.overallStatus === 'CRÍTICO' ? 'bg-red-500' : 'bg-green-500'}`}>
                {activeSite.overallStatus}
              </span>
              <h4 className="font-black text-xs uppercase text-slate-900 mt-1">{activeSite.equipmentName}</h4>
              <p className="text-[9px] text-slate-500 font-bold mb-3 uppercase tracking-tighter">{activeSite.norm || 'F-SER-000'}</p>
              <button 
                className="w-full bg-slate-900 text-white text-[9px] py-2.5 rounded-xl font-black uppercase flex items-center justify-center gap-2 transition-all hover:bg-red-600"
                onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeSite.location.lat},${activeSite.location.lng}`)}
              >
                <Navigation2 size={14}/> Iniciar Ruta
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* 3. FILTROS TÉCNICOS (LADO IZQUIERDO) */}
      <div className="absolute top-28 left-5 z-[1000] flex flex-col gap-4">
        {/* Selector de Norma */}
        <div className="bg-[#111827]/90 backdrop-blur-xl border border-white/10 p-2 rounded-3xl shadow-2xl flex flex-col gap-2 w-fit">
          <button 
            onClick={() => { setSelectedNFPA('ALL'); setSelectedType('ALL'); }} 
            className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'ALL' ? 'bg-red-600 text-white shadow-xl shadow-red-600/30' : 'text-slate-500 hover:bg-white/5'}`}
          >
            <LayoutGrid size={22}/>
          </button>
          <div className="h-[1px] w-8 bg-white/10 mx-auto"></div>
          <button 
            onClick={() => { setSelectedNFPA('NFPA 25'); setSelectedType('ALL'); }} 
            className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'NFPA 25' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-white'}`}
          >
            <Droplets size={22}/>
          </button>
          <button 
            onClick={() => { setSelectedNFPA('NFPA 72'); setSelectedType('ALL'); }} 
            className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'NFPA 72' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-white'}`}
          >
            <Bell size={22}/>
          </button>
        </div>

        {/* Selector de Categoría PCI (Dinámico) */}
        {selectedNFPA !== 'ALL' && (
          <div className="bg-[#111827]/90 backdrop-blur-xl border border-white/10 p-2.5 rounded-3xl shadow-2xl flex flex-col gap-1.5 animate-in slide-in-from-left duration-300">
            {categories[selectedNFPA].map(cat => (
              <button 
                key={cat.id} 
                onClick={() => setSelectedType(cat.id === selectedType ? 'ALL' : cat.id)} 
                className={`px-4 py-3 rounded-2xl text-[9px] font-black transition-all flex items-center gap-3 ${
                  selectedType === cat.id ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {cat.icon}
                {cat.id}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 4. BOTÓN GPS POSICIÓN ACTUAL */}
      <div className="absolute bottom-36 right-6 z-[1000]">
        <button 
          onClick={() => userPos && map.panTo(userPos)} 
          className="bg-red-600 p-5 rounded-3xl border-4 border-red-400/30 text-white active:scale-90 shadow-2xl transition-all hover:bg-red-500"
        >
          <LocateFixed size={28} />
        </button>
      </div>

      {/* 5. ANALYTICS FOOTER TLETL */}
      <div className="absolute bottom-8 left-5 right-5 z-[1000]">
        <div className="bg-[#111827]/95 backdrop-blur-2xl border border-white/10 p-5 rounded-[2.5rem] shadow-2xl max-w-2xl mx-auto flex items-center justify-around overflow-hidden relative">
          {/* Decoración de fondo */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>
          
          <div className="text-center group transition-transform hover:scale-110">
            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Equipos en Radar</span>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-3xl font-black text-white">{filteredSites.length}</span>
            </div>
          </div>

          <div className="h-12 w-[1px] bg-white/10"></div>

          <div className="text-center group transition-transform hover:scale-110">
            <span className="block text-[8px] font-black text-red-500/50 uppercase tracking-[0.2em] mb-1">Hallazgos Críticos</span>
            <div className="flex items-center gap-2 justify-center">
               <ShieldCheck className="text-red-500" size={18}/>
               <span className="text-3xl font-black text-red-500">
                 {filteredSites.filter(s => s.overallStatus === 'CRÍTICO').length}
               </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}