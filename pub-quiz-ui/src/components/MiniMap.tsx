import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const pinIcon = L.divIcon({
  className: 'dragon-pin',
  html: '<div style="width:26px;height:26px;background:#B6F23E;border:4px solid #070818;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 6px 16px rgba(0,0,0,.5)"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
})

/**
 * The map is created before its box stretches to the height of the
 * description beside it, so Leaflet centers on the first, smaller size and the
 * pin ends up near the bottom. Re-measure and re-center whenever the box resizes.
 */
function KeepCentered({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    const el = map.getContainer()
    const recenter = () => { map.invalidateSize(); map.setView([lat, lng], map.getZoom(), { animate: false }) }
    const ro = new ResizeObserver(recenter)
    ro.observe(el)
    recenter()
    return () => ro.disconnect()
  }, [map, lat, lng])
  return null
}

/** A still, dark map of one venue, for the quiz page. */
export default function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <MapContainer center={[lat, lng]} zoom={15} style={{ position: 'absolute', inset: 0 }} zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false} keyboard={false}>
      <TileLayer className="dark-tiles" attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[lat, lng]} icon={pinIcon} interactive={false} />
      <KeepCentered lat={lat} lng={lng} />
    </MapContainer>
  )
}
