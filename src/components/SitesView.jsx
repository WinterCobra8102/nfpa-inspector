import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { db } from '../db';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function SitesView() {

  const [sites, setSites] = useState([]);
  const [userPos, setUserPos] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [apiResults, setApiResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState({ lat: 20.9673, lng: -89.5925 });

  useEffect(() => {
    loadSitesFromDB();

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude
        };
        setUserPos(coords);
      });
    }
  }, []);

  const loadSitesFromDB = async () => {
    const all = await db.inspections.toArray();
    setSites(all.filter(ins => ins.location?.lat && ins.location?.lng));
  };

  // 🔎 BUSCADOR (NOMINATIM)
  const handleTyping = async (text) => {
    setSearchTerm(text);

    if (text.length < 3) {
      setApiResults([]);
      return;
    }

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&countrycodes=mx`;
      const res = await fetch(url);
      const data = await res.json();
      setApiResults(data);
    } catch (err) {
      console.error(err);
    }
  };

  const selectPlace = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);

    setSelectedLocation({
      lat,
      lng,
      name: item.display_name.split(',')[0],
      full_address: item.display_name
    });

    setMapCenter({ lat, lng });
    setSearchTerm(item.display_name.split(',')[0]);
    setApiResults([]);
  };

  const registerNewClient = async () => {
    if (!selectedLocation) return;

    const loading = toast.loading("Registrando...");

    try {
      const { error } = await supabase.from('clientes').insert([{
        nombre: selectedLocation.name.toUpperCase(),
        direccion: selectedLocation.full_address,
        latitud: selectedLocation.lat,
        longitud: selectedLocation.lng
      }]);

      if (error) throw error;

      toast.success("Sucursal registrada", { id: loading });

      setSelectedLocation(null);
      setSearchTerm('');

    } catch (e) {
      toast.error(e.message, { id: loading });
    }
  };

  const filteredSites = useMemo(() => sites, [sites]);

  return (
    <div className="h-full w-full relative">

      {/* BUSCADOR */}
      <div style={{
        position: "absolute",
        top: 20,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        width: "400px"
      }}>
        <input
          value={searchTerm}
          onChange={(e) => handleTyping(e.target.value)}
          placeholder="Buscar lugar..."
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "20px"
          }}
        />

        {apiResults.length > 0 && (
          <div style={{
            background: "#111",
            color: "white",
            borderRadius: "16px",
            marginTop: "8px",
            maxHeight: "300px",
            overflowY: "auto"
          }}>
            {apiResults.map((item, i) => (
              <div
                key={i}
                onClick={() => selectPlace(item)}
                style={{ padding: "10px", cursor: "pointer" }}
              >
                {item.display_name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MAPA GOOGLE */}
      <LoadScript googleMapsApiKey="TU_API_KEY_AQUI">

        <GoogleMap
          mapContainerStyle={{ height: "100vh", width: "100%" }}
          center={mapCenter}
          zoom={13}
          options={{
            disableDefaultUI: true
          }}
        >

          {/* Usuario */}
          {userPos && (
            <Marker position={userPos} />
          )}

          {/* Ubicación buscada */}
          {selectedLocation && (
            <Marker position={{
              lat: selectedLocation.lat,
              lng: selectedLocation.lng
            }} />
          )}

          {/* Tus sitios de la base */}
          {filteredSites.map((site) => (
            <Marker
              key={site.id}
              position={{
                lat: site.location.lat,
                lng: site.location.lng
              }}
            />
          ))}

        </GoogleMap>

      </LoadScript>

      {/* BOTÓN REGISTRAR */}
      {selectedLocation && (
        <button
          onClick={registerNewClient}
          style={{
            position: "absolute",
            bottom: 30,
            right: 30,
            padding: "15px",
            background: "red",
            color: "white",
            borderRadius: "20px",
            zIndex: 10
          }}
        >
          Registrar Empresa
        </button>
      )}

    </div>
  );
}