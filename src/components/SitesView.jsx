import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete, InfoWindow } from '@react-google-maps/api';
import { 
  LocateFixed, Search, LayoutGrid, MapPin, 
  Navigation2, Droplets, Bell, ChevronRight, X, Loader2, PlusCircle, ShieldCheck, 
  Activity, Waves, Box, Clipboard, UserPlus, Key, Mail
} from 'lucide-react';
import { db } from '../db';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

// --- CONFIGURACIÓN CRÍTICA (FUERA DEL COMPONENTE) ---
const libraries = ['places']; 
const centerMerida = { lat: 20.9673, lng: -89.5925 };
const containerStyle = { width: '100%', height: '100vh' };

const mapOptions = {
  disableDefaultUI: true,
  styles: [
    { "elementType": "geometry", "stylers": [{ "color": "#1d1d1b" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
    { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
  ]
};

export default function SitesView() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: "AIzaSyBveI-_k-o2HEhcY9QkBiGPMgquQQEOsJY",
    libraries
  });

  const [map, setMap] = useState(null);
  const [sites, setSites] = useState([]);
  const [userPos, setUserPos] = useState(null);
  const [autocomplete, setAutocomplete] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [activeSite, setActiveSite] = useState(null);
  const [showManagerForm, setShowManagerForm] = useState(false);
  const [managerData, setManagerData] = useState({ name: '', email: '', pass: '' });
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

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (!place || !place.geometry || !place.geometry.location) return;

      const newPos = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        name: place.name || "Ubicación",
        address: place.formatted_address || ""
      };

      setSelectedPlace(newPos);
      setShowManagerForm(false);
      if (map) {
        map.panTo(newPos);
        map.setZoom(17);
      }
    }
  };

  const handleFinalRegistration = async () => {
    if (!managerData.name || !managerData.email) {
      toast.error("Datos del Jefe obligatorios");
      return;
    }
    const loading = toast.loading("Registrando empresa y jefe...");
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
      toast.success("Registro Exitoso", { id: loading });
      setSelectedPlace(null);
      setShowManagerForm(false);
    } catch (e) { toast.error(e.message, { id: loading }); }
  };

  const filteredSites = useMemo(() => {
    if (selectedNFPA === 'ALL') return sites;
    return sites.filter(s => s.standard === selectedNFPA);
  }, [sites, selectedNFPA]);

  if (loadError) return <div className="h-full flex items-center justify-center bg-black text-red-500 font-black p-10 text-center uppercase">Error de Google: Revisa Restricciones y APIs</div>;
  if (!isLoaded) return <div className="h-full flex items-center justify-center bg-slate-900 text-white font-black"><Loader2 className="animate-spin mr-2"/> Iniciando Radar...</div>;

  return (
    <div className="h-full w-full relative overflow-hidden bg-[#111]">
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[95%] md:w-[500px] z-[1000]">
        <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
          <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-3xl px-6 py-4 flex items-center gap-4 shadow-2xl transition-all focus-within:ring-4 focus-within:ring-blue-500/20">
            <Search className="text-slate-500" size={22} />
            <input type="text" placeholder="Buscar empresa o dirección..." className="bg-transparent border-none w-full text-white font-bold text-sm outline-none" />
          </div>
        </Autocomplete>
      </div>

      <GoogleMap mapContainerStyle={containerStyle} center={centerMerida} zoom={13} onLoad={setMap} options={mapOptions}>
        {selectedPlace && (
          <Marker position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}>
            <InfoWindow onCloseClick={() => setSelectedPlace(null)}>
              <div className="p-4 min-w-[250px] bg-white rounded-xl shadow-none">
                {!showManagerForm ? (
                  <div className="text-center">
                    <h4 className="font-black text-xs uppercase mb-3 text-slate-800 border-b pb-2">{selectedPlace.name}</h4>
                    <button onClick={() => setShowManagerForm(true)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Registrar Sucursal</button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-[10px] font-black text-blue-600 uppercase text-center border-b pb-2">Datos del Jefe</p>
                    <input placeholder="Nombre Completo" className="bg-slate-100 p-2 rounded-xl text-[10px] w-full font-bold outline-none" value={managerData.name} onChange={e => setManagerData({...managerData, name: e.target.value})} />
                    <input placeholder="Email" className="bg-slate-100 p-2 rounded-xl text-[10px] w-full font-bold outline-none" value={managerData.email} onChange={e => setManagerData({...managerData, email: e.target.value})} />
                    <input type="password" placeholder="Pass Temporal" className="bg-slate-100 p-2 rounded-xl text-[10px] w-full font-bold outline-none" value={managerData.pass} onChange={e => setManagerData({...managerData, pass: e.target.value})} />
                    <button onClick={handleFinalRegistration} className="w-full bg-green-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-xl mt-1">Finalizar</button>
                  </div>
                )}
              </div>
            </InfoWindow>
          </Marker>
        )}
        {filteredSites.map(site => (
          <Marker key={site.id} position={{ lat: site.location.lat, lng: site.location.lng }} onClick={() => setActiveSite(site)} icon={site.overallStatus === 'CRÍTICO' ? "http://maps.google.com/?q=$5" : "http://maps.google.com/?q=$6"} />
        ))}
      </GoogleMap>

      {/* FOOTER ANALYTICS */}
      <div className="absolute bottom-8 left-5 right-5 z-[1000]">
        <div className="bg-[#111827]/95 backdrop-blur-2xl border border-white/10 p-5 rounded-[2.5rem] shadow-2xl max-w-2xl mx-auto flex items-center justify-around overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>
          <div className="text-center group transition-transform hover:scale-110">
            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Equipos en Radar</span>
            <div className="flex items-center gap-2 justify-center">
               <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-3xl font-black text-white">{filteredSites.length}</span>
            </div>
          </div>
          <div className="h-12 w-[1px] bg-white/10"></div>
          <div className="text-center group transition-transform hover:scale-110">
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