'use client'

import { useEffect } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

type TrackingRoute = {
  id: string
  code: string
  status: string
  originLabel?: string | null
  destinationLabel?: string | null
  locationPings?: Array<{
    id: string
    latitude: number
    longitude: number
    capturedAt: string
  }>
}

export default function ShipmentsLiveMap({ routes }: { routes: TrackingRoute[] }) {
  useEffect(() => {
    delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    })
  }, [])

  const defaultCenter: [number, number] = [-23.5505, -46.6333]
  const firstPing = routes.flatMap((route) => route.locationPings || [])[0]
  const center: [number, number] = firstPing
    ? [firstPing.latitude, firstPing.longitude]
    : defaultCenter

  return (
    <MapContainer center={center} zoom={9} style={{ height: '100%', width: '100%', borderRadius: '0.75rem' }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {routes.map((route) => {
        const latestPing = route.locationPings?.[0]
        if (!latestPing) return null

        return (
          <Marker key={route.id} position={[latestPing.latitude, latestPing.longitude]}>
            <Popup>
              <strong>{route.code}</strong>
              <br />
              {route.originLabel || 'Origem não informada'} {'>'} {route.destinationLabel || 'Destino não informado'}
              <br />
              Status: {route.status}
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
