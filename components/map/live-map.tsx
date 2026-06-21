'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

export default function LiveMap({ freights }: { freights: any[] }) {
  useEffect(() => {
    // Fix leafet marker loading issue
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
  }, []);

  const defaultCenter: [number, number] = [-23.5505, -46.6333]; // São Paulo default

  return (
    <MapContainer 
      center={defaultCenter} 
      zoom={8} 
      style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {/* Aqui iremos renderizar os markers reais depois que integrarmos a LocationHistory no Backend */}
      {/* 
        Abaixo, um mock demonstrativo baseando-se no freight array se tivessem coordenadas. 
        Como ainda nao vem no payload, a UI ao menos renderiza o mapa navegável.
      */}
    </MapContainer>
  );
}
