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

const containerStyle = { width: '100%', height: '100vh' };
const centerMerida = { lat: 20.9673, lng: -89.5925 };
const libraries = ['places'];

const mapOptions = {
  disableDefaultUI: true,
  styles: [
    { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
    { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
    { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] }
  ]
};

export default function SitesView() {
  const { isLoaded } = useJsApiLoader({
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
  
  // --- NUEVOS ESTADOS PARA REGISTRO DE JEFE ---
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
      if (!place.geometry) return;
      const newPos = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        name: place.name,
        address: place.formatted_address
      };
      setSelectedPlace(newPos);
      setShowManagerForm(false); // Resetear formulario al buscar nuevo lugar
      if (map) { map.panTo(newPos); map.setZoom(17); }
    }
  };

  // --- FUNCIÓN DE REGISTRO INTEGRAL (EMPRESA + VINCULACIÓN DE JEFE) ---
  const handleFinalRegistration = async () => {
    if (!managerData.name || !managerData.email) {
      toast.error("Datos del Jefe obligatorios");
      return;
    }

    const loading = toast.loading("Legalizando sucursal y accesos...");
    try {
      // 1. Insertar Cliente
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

      // 2. Lógica de Perfil (como lo manejamos en el Dashboard)
      if (managerData.pass) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('email', managerData.email).single();
        
        if (profile) {
          // Actualizar password vía RPC si el perfil existe
          await supabase.rpc('admin_update_user', {
            target_user_id: profile.id,
            new_password: managerData.pass
          });

          // Vincular perfil a la nueva empresa
          await supabase.from('profiles').update({ 
            client_id: newClient.id,
            role: 'MANAGER' 
          }).eq('id', profile.id);
        }
      }

      toast.success("Sucursal y Jefe registrados", { id: loading });
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
    if (selectedType !== 'ALL') {
      const typeMap = { 'BOMBAS': ['IPM-01-D', 'IPM-01-E'], 'HIDRANTES': ['IPM-04'], 'ALARMAS': ['IPM-03'] };
      result = result.filter(s => typeMap[selectedType]?.includes(s.serviceCode));
    }
    return result;
  }, [sites, selectedNFPA, selectedType]);

  if (!isLoaded) return <div className="h-full flex items-center justify-center bg-slate-900 text-white font-black"><Loader2 className="animate-spin mr-2"/> Cargando...</div>;

  return (
    <div className="h-full w-full relative overflow-hidden bg-slate-900">
      
      {/* BUSCADOR */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[95%] md:w-[500px] z-[1000]">
        <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
          <div className="bg-[#111827]/95 backdrop-blur-xl border border-white/10 rounded-3xl px-6 py-4 flex items-center gap-4 shadow-2xl">
            <Search className="text-slate-500" size={22} />
            <input type="text" placeholder="Buscar lugar para registrar..." className="bg-transparent border-none w-full text-white font-bold text-sm outline-none" />
          </div>
        </Autocomplete>
      </div>

      <GoogleMap
        mapContainerStyle={containerStyle}
        center={centerMerida}
        zoom={13}
        onLoad={setMap}
        options={mapOptions}
      >
        {selectedPlace && (
          <Marker position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}>
            <InfoWindow onCloseClick={() => setSelectedPlace(null)}>
              <div className="p-4 min-w-[240px] bg-white rounded-xl">
                {!showManagerForm ? (
                  <>
                    <h4 className="font-black text-xs uppercase mb-3 text-slate-800 leading-tight border-b pb-2">{selectedPlace.name}</h4>
                    <button 
                      onClick={() => setShowManagerForm(true)}
                      className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-lg flex items-center justify-center gap-2"
                    >
                      <PlusCircle size={16}/> Iniciar Registro
                    </button>
                  </>
                ) : (
                  <div className="space-y-3 animate-in slide-in-from-bottom-2">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Datos del Encargado</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg">
                        <UserPlus size={14} className="text-slate-400"/>
                        <input placeholder="Nombre del Jefe" className="bg-transparent text-[10px] font-bold outline-none w-full" value={managerData.name} onChange={e => setManagerData({...managerData, name: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg">
                        <Mail size={14} className="text-slate-400"/>
                        <input placeholder="Email de Acceso" className="bg-transparent text-[10px] font-bold outline-none w-full" value={managerData.email} onChange={e => setManagerData({...managerData, email: e.target.value})} />
                      </div>
                      <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg">
                        <Key size={14} className="text-slate-400"/>
                        <input type="password" placeholder="Contraseña Temporal" className="bg-transparent text-[10px] font-bold outline-none w-full" value={managerData.pass} onChange={e => setManagerData({...managerData, pass: e.target.value})} />
                      </div>
                    </div>
                    <button onClick={handleFinalRegistration} className="w-full bg-green-600 text-white py-3 rounded-xl font-black text-[10px] uppercase shadow-xl mt-2">Finalizar Registro</button>
                    <button onClick={() => setShowManagerForm(false)} className="w-full text-slate-400 font-bold text-[8px] uppercase">Atrás</button>
                  </div>
                )}
              </div>
            </InfoWindow>
          </Marker>
        )}

        {/* Pines Existentes */}
        {filteredSites.map(site => (
          <Marker 
            key={site.id} 
            position={{ lat: site.location.lat, lng: site.location.lng }} 
            onClick={() => setActiveSite(site)}
            icon={{ url: site.overallStatus === 'CRÍTICO' ? "usercontent.com/maps.google.com/17" : "http://maps.google.com/?q=$9", scaledSize: new window.google.maps.Size(35, 35) }}
          />
        ))}

        {activeSite && (
          <InfoWindow position={{ lat: activeSite.location.lat, lng: activeSite.location.lng }} onCloseClick={() => setActiveSite(null)}>
            <div className="p-2">
              <h4 className="font-black text-[10px] uppercase">{activeSite.equipmentName}</h4>
              <button className="w-full bg-slate-900 text-white text-[8px] py-1.5 mt-2 rounded-lg font-black" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${activeSite.location.lat},${activeSite.location.lng}`)}>RUTA</button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* FILTROS PCI */}
      <div className="absolute top-28 left-5 z-[1000] flex flex-col gap-4">
        <div className="bg-[#111827]/90 backdrop-blur-xl border border-white/10 p-2 rounded-3xl shadow-2xl flex flex-col gap-2">
          <button onClick={() => { setSelectedNFPA('ALL'); setSelectedType('ALL'); }} className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'ALL' ? 'bg-red-600 text-white' : 'text-slate-500'}`}><LayoutGrid size={22}/></button>
          <button onClick={() => setSelectedNFPA('NFPA 25')} className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'NFPA 25' ? 'bg-white text-slate-900' : 'text-slate-500'}`}><Droplets size={22}/></button>
          <button onClick={() => setSelectedNFPA('NFPA 72')} className={`p-4 rounded-2xl transition-all ${selectedNFPA === 'NFPA 72' ? 'bg-white text-slate-900' : 'text-slate-500'}`}><Bell size={22}/></button>
        </div>
      </div>

      {/* ANALYTICS */}
      <div className="absolute bottom-8 left-5 right-5 z-[1000]">
        <div className="bg-[#111827]/95 backdrop-blur-2xl border border-white/10 p-5 rounded-[2.5rem] shadow-2xl max-w-2xl mx-auto flex items-center justify-around">
          <div className="text-center">
            <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Equipos en Radar</span>
            <span className="text-2xl font-black text-white">{filteredSites.length}</span>
          </div>
          <div className="h-10 w-[1px] bg-white/10"></div>
          <div className="text-center">
            <span className="block text-[8px] font-black text-red-500 uppercase tracking-widest mb-1">Críticos</span>
            <span className="text-2xl font-black text-red-500">{filteredSites.filter(s => s.overallStatus === 'CRÍTICO').length}</span>
          </div>
        </div>
      </div>

    </div>
  );
}