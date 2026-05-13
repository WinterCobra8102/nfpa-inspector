import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete, InfoWindow } from '@react-google-maps/api';
import { 
  LocateFixed, Search, LayoutGrid, MapPin, 
  Navigation2, Droplets, Bell, ChevronRight, X, Loader2, PlusCircle, ShieldCheck 
} from 'lucide-react';
import { db } from '../db';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

// Configuración del Mapa
const containerStyle = { width: '100%', height: '100vh' };
const centerMerida = { lat: 20.9673, lng: -89.5925 };
const libraries = ['places']; // Indispensable para el buscador

export default function SitesView() {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyBveI-_k-o2HEhcY9QkBiGPMgquQQEOsJY", // Tu llave ya integrada
    libraries
  });

  const [map, setMap] = useState(null);
  const [sites, setSites] = useState([]);
  const [userPos, setUserPos] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null); // Pin de búsqueda (Azul)
  
  // Filtros PCI
  const [selectedNFPA, setSelectedNFPA] = useState('ALL');

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
    setSites(all.filter(ins => ins.location?.lat && ins.location?.lng));
  };

  // Lógica del Buscador de Google
  const onAutocompleteLoad = (auto) => setAutocomplete(auto);
  
  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) {
        toast.error("No se encontraron detalles de esta ubicación");
        return;
      }

      const newPos = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        name: place.name,
        address: place.formatted_address
      };

      setSelectedPlace(newPos);
      map.panTo(newPos);
      map.setZoom(17);
    }
  };

  const registerNewClient = async () => {
    if (!selectedPlace) return;
    const loading = toast.loading("Registrando sucursal...");
    try {
      const { error } = await supabase.from('clientes').insert([{
        nombre: selectedPlace.name.toUpperCase(),
        direccion: selectedPlace.address,
        latitud: selectedPlace.lat,
        longitud: selectedPlace.lng
      }]);
      if (error) throw error;
      toast.success("Empresa añadida a TLETL", { id: loading });
      setSelectedPlace(null);
    } catch (e) { toast.error(e.message, { id: loading }); }
  };

  const filteredSites = useMemo(() => {
    if (selectedNFPA === 'ALL') return sites;
    return sites.filter(s => s.standard === selectedNFPA);
  }, [sites, selectedNFPA]);

  if (!isLoaded) return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-900 text-white font-black uppercase tracking-widest gap-4">
      <Loader2 className="animate-spin text-red-500" size={48}/>
      <p>Cargando Ingeniería de Mapas...</p>
    </div>
  );

  return (
    <div className="h-full w-full relative overflow-hidden">
      
      {/* BARRA DE BÚSQUEDA GOOGLE OFICIAL */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[90%] md:w-[500px] z-[10]">
        <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
          <div className="bg-[#111827]/95 backdrop-blur-xl border border-white/10 rounded-3xl px-6 py-4 flex items-center gap-4 shadow-2xl transition-all focus-within:ring-4 focus-within:ring-blue-500/20">
            <Search className="text-slate-500" size={22} />
            <input 
              type="text" 
              placeholder="Buscar plaza, negocio o calle..."
              className="bg-transparent border-none w-full text-white font-bold text-sm outline-none placeholder:text-slate-500"
            />
            {selectedPlace && (
              <button onClick={() => setSelectedPlace(null)} className="text-slate-500 hover:text-white"><X size={20}/></button>
            )}
          </div>
        </Autocomplete>
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={centerMerida}
        zoom={13}
        onLoad={m => setMap(m)}
        options={{
          disableDefaultUI: true,
          styles: [
            { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
            { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
            { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#303030" }] },
            { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
          ]
        }}
      >
        {/* Marcador de Búsqueda (Site potencial) */}
        {selectedPlace && (
          <Marker 
            position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
            icon="http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
          >
            <InfoWindow onCloseClick={() => setSelectedPlace(null)}>
              <div className="p-2 text-center min-w-[150px]">
                <h4 className="font-black text-xs uppercase mb-2 text-slate-800">{selectedPlace.name}</h4>
                <button 
                  onClick={registerNewClient} 
                  className="bg-blue-600 text-white text-[9px] px-3 py-2 rounded-lg font-black uppercase shadow-lg active:scale-95 transition-all"
                >
                  Registrar en TLETL
                </button>
              </div>
            </InfoWindow>
          </Marker>
        )}

        {/* Equipos PCI ya registrados */}
        {filteredSites.map(site => (
          <Marker 
            key={site.id}
            position={{ lat: site.location.lat, lng: site.location.lng }}
            label={{
              text: site.serviceCode.split('-')[1],
              color: 'white',
              fontWeight: '900',
              fontSize: '10px'
            }}
            icon={site.overallStatus === 'CRÍTICO' ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png" : "http://maps.google.com/mapfiles/ms/icons/green-dot.png"}
          />
        ))}

        {/* Usuario */}
        {userPos && <Marker position={userPos} icon="http://maps.google.com/mapfiles/ms/icons/man.png" />}
      </GoogleMap>

      {/* FILTROS PCI IZQUIERDA */}
      <div className="absolute top-28 left-5 z-[10] flex flex-col gap-3">
        <div className="bg-[#111827]/90 backdrop-blur-xl border border-white/10 p-2 rounded-3xl shadow-2xl flex flex-col gap-2">
          <button onClick={() => setSelectedNFPA('ALL')} className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'ALL' ? 'bg-red-600 text-white' : 'text-slate-500'}`}><LayoutGrid size={22}/></button>
          <button onClick={() => setSelectedNFPA('NFPA 25')} className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'NFPA 25' ? 'bg-white text-slate-900' : 'text-slate-500'}`}><Droplets size={22}/></button>
          <button onClick={() => setSelectedNFPA('NFPA 72')} className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'NFPA 72' ? 'bg-white text-slate-900' : 'text-slate-500'}`}><Bell size={22}/></button>
        </div>
      </div>

      {/* ANALYTICS FOOTER */}
      <div className="absolute bottom-8 left-5 right-5 z-[10]">
        <div className="bg-[#111827]/95 backdrop-blur-2xl border border-white/10 p-5 rounded-[2.5rem] shadow-2xl max-w-2xl mx-auto flex items-center justify-around">
          <div className="text-center group">
            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Equipos</span>
            <span className="text-2xl font-black text-white">{filteredSites.length}</span>
          </div>
          <div className="h-10 w-[1px] bg-white/10"></div>
          <div className="text-center group">
            <span className="block text-[8px] font-black text-red-500 uppercase tracking-widest mb-1">Fallas</span>
            <span className="text-2xl font-black text-red-500">{filteredSites.filter(s => s.overallStatus === 'CRÍTICO').length}</span>
          </div>
        </div>
      </div>

      {/* BOTÓN GPS */}
      <div className="absolute bottom-36 right-6 z-[10]">
        <button onClick={() => userPos && map.panTo(userPos)} className="bg-red-600 p-5 rounded-3xl text-white shadow-2xl active:scale-90 transition-all border-4 border-red-500/20">
          <LocateFixed size={28} />
        </button>
      </div>

    </div>
  );
}