import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Autocomplete, InfoWindow } from '@react-google-maps/api';
import { 
  LocateFixed, Search, LayoutGrid, MapPin, 
  Navigation2, Droplets, Bell, ChevronRight, X, Loader2, PlusCircle, ShieldCheck, 
  Activity, Waves, Box, Clipboard, UserPlus, Key, Mail
} from 'lucide-react';
import { db } from '../db';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

// --- CONFIGURACIÓN FUERA DEL COMPONENTE (EVITA RE-RENDERS) ---
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
    'NFPA 72': [{ id: 'ALARMAS', icon: <Bell size={14}/> }]
  };

  // --- CARGA INICIAL ---
  useEffect(() => {
    loadSitesFromDB();
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => console.log("GPS denegado")
      );
    }
  }, []);

  const loadSitesFromDB = async () => {
    const all = await db.inspections.toArray();
    setSites(all.filter(ins => ins.location?.lat && ins.location?.lng));
  };

  // --- MANEJO SEGURO DE BÚSQUEDA (ANTI-PANTALLAZO BLANCO) ---
  const onPlaceChanged = () => {
    if (!autocomplete) return;
    
    const place = autocomplete.getPlace();
    
    // VALIDACIÓN CRÍTICA: Si no hay geometría, no hacemos NADA (evita crash)
    if (!place || !place.geometry || !place.geometry.location) {
      toast.error("Por favor, selecciona un lugar de la lista desplegable.");
      return;
    }

    try {
      const newPos = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        name: place.name || "Lugar sin nombre",
        address: place.formatted_address || "Dirección no disponible"
      };

      setSelectedPlace(newPos);
      setShowManagerForm(false);
      
      if (map) {
        map.panTo(newPos);
        map.setZoom(17);
      }
    } catch (err) {
      console.error("Error al procesar ubicación:", err);
      toast.error("Ocurrió un error al ubicar el lugar.");
    }
  };

  const handleFinalRegistration = async () => {
    if (!managerData.name || !managerData.email) {
      toast.error("El nombre y email del Jefe son obligatorios");
      return;
    }

    const loading = toast.loading("Registrando sucursal y accesos...");
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
        .select()
        .single();

      if (clientError) throw clientError;

      if (managerData.pass) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('email', managerData.email).single();
        if (profile) {
          await supabase.rpc('admin_update_user', { target_user_id: profile.id, new_password: managerData.pass });
          await supabase.from('profiles').update({ client_id: newClient.id, role: 'MANAGER' }).eq('id', profile.id);
        }
      }

      toast.success("Empresa y Jefe legalizados", { id: loading });
      setSelectedPlace(null);
      setManagerData({ name: '', email: '', pass: '' });
      setShowManagerForm(false);
    } catch (e) {
      toast.error("Error: " + e.message, { id: loading });
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

  // --- RENDERS ---
  if (loadError) return <div className="h-full flex items-center justify-center bg-black text-red-500 font-black uppercase p-10 text-center">Error Crítico: Revisa tu API Key y Facturación de Google</div>;
  if (!isLoaded) return <div className="h-full flex flex-col items-center justify-center bg-slate-950 text-white font-black uppercase gap-4"><Loader2 className="animate-spin text-red-600" size={40}/> Iniciando Radar TLETL...</div>;

  return (
    <div className="h-full w-full relative overflow-hidden bg-[#111]">
      
      {/* BARRA DE BÚSQUEDA */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[95%] md:w-[500px] z-[1000]">
        <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
          <div className="bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-3xl px-6 py-4 flex items-center gap-4 shadow-2xl transition-all focus-within:ring-4 focus-within:ring-blue-500/20">
            <Search className="text-slate-500" size={22} />
            <input 
              type="text" 
              placeholder="Buscar plaza o dirección..." 
              className="bg-transparent border-none w-full text-white font-bold text-sm outline-none placeholder:text-slate-600" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && <button onClick={() => setSearchTerm('')}><X size={18} className="text-slate-500"/></button>}
          </div>
        </Autocomplete>
      </div>

      {/* MAPA */}
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={centerMerida}
        zoom={13}
        onLoad={setMap}
        options={mapOptions}
      >
        {userPos && <Marker position={userPos} icon="http://maps.google.com/?q=$7" />}

        {selectedPlace && (
          <Marker position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}>
            <InfoWindow onCloseClick={() => setSelectedPlace(null)}>
              <div className="p-4 min-w-[260px] bg-white rounded-xl shadow-none">
                {!showManagerForm ? (
                  <div className="text-center">
                    <h4 className="font-black text-xs uppercase mb-3 text-slate-800 leading-tight border-b pb-2">{selectedPlace.name}</h4>
                    <button 
                      onClick={() => setShowManagerForm(true)}
                      className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg flex items-center justify-center gap-2"
                    >
                      <PlusCircle size={16}/> Iniciar Registro de Empresa
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest text-center border-b pb-2">Datos del Jefe Responsable</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                        <UserPlus size={14} className="text-slate-400"/>
                        <input placeholder="Nombre completo" className="bg-transparent text-[10px] font-bold outline-none w-full text-slate-700" value={managerData.name} onChange={e => setManagerData({...managerData, name: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                        <Mail size={14} className="text-slate-400"/>
                        <input placeholder="Email de Acceso" className="bg-transparent text-[10px] font-bold outline-none w-full text-slate-700" value={managerData.email} onChange={e => setManagerData({...managerData, email: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                        <Key size={14} className="text-slate-400"/>
                        <input type="password" placeholder="Pass Temporal" className="bg-transparent text-[10px] font-bold outline-none w-full text-slate-700" value={managerData.pass} onChange={e => setManagerData({...managerData, pass: e.target.value})} />
                      </div>
                    </div>
                    <button onClick={handleFinalRegistration} className="w-full bg-red-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-xl mt-2 active:scale-95 transition-all">Finalizar y Guardar</button>
                    <button onClick={() => setShowManagerForm(false)} className="w-full text-slate-400 font-bold text-[8px] uppercase">Volver</button>
                  </div>
                )}
              </div>
            </InfoWindow>
          </Marker>
        )}

        {filteredSites.map(site => (
          <Marker 
            key={site.id} 
            position={{ lat: site.location.lat, lng: site.location.lng }} 
            onClick={() => setActiveSite(site)}
            icon={{ 
                url: site.overallStatus === 'CRÍTICO' ? "http://maps.google.com/?q=$5" : "http://maps.google.com/?q=$6", 
                scaledSize: new window.google.maps.Size(35, 35) 
            }}
          />
        ))}

        {activeSite && (
          <InfoWindow position={{ lat: activeSite.location.lat, lng: activeSite.location.lng }} onCloseClick={() => setActiveSite(null)}>
            <div className="p-2 text-center">
              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full text-white ${activeSite.overallStatus === 'CRÍTICO' ? 'bg-red-500' : 'bg-green-500'}`}>{activeSite.overallStatus}</span>
              <h4 className="font-black text-[10px] uppercase text-slate-800 mt-2">{activeSite.equipmentName}</h4>
              <button className="w-full bg-slate-900 text-white text-[8px] py-2 mt-2 rounded-lg font-black" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeSite.location.lat},${activeSite.location.lng}`)}>IR A GOOGLE MAPS</button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* FILTROS TÉCNICOS */}
      <div className="absolute top-28 left-5 z-[1000] flex flex-col gap-4">
        <div className="bg-[#111827]/90 backdrop-blur-xl border border-white/10 p-2 rounded-3xl shadow-2xl flex flex-col gap-2 w-fit">
          <button onClick={() => { setSelectedNFPA('ALL'); setSelectedType('ALL'); }} className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'ALL' ? 'bg-red-600 text-white shadow-xl' : 'text-slate-500 hover:bg-white/5'}`}><LayoutGrid size={22}/></button>
          <div className="h-[1px] w-8 bg-white/10 mx-auto"></div>
          <button onClick={() => { setSelectedNFPA('NFPA 25'); setSelectedType('ALL'); }} className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'NFPA 25' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-white'}`}><Droplets size={22}/></button>
          <button onClick={() => { setSelectedNFPA('NFPA 72'); setSelectedType('ALL'); }} className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'NFPA 72' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-500 hover:text-white'}`}><Bell size={22}/></button>
        </div>
      </div>

      {/* BOTÓN GPS */}
      <div className="absolute bottom-36 right-6 z-[1000]">
        <button onClick={() => userPos && map.panTo(userPos)} className="bg-red-600 p-5 rounded-3xl border-4 border-red-400/30 text-white active:scale-90 shadow-2xl transition-all hover:bg-red-500">
          <LocateFixed size={28} />
        </button>
      </div>

      {/* ANALYTICS FOOTER */}
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
            <span className="block text-[8px] font-black text-red-500/50 uppercase tracking-[0.2em] mb-1">Hallazgos Críticos</span>
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