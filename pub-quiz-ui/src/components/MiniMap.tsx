import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const pinIcon = L.divIcon({
  className: 'dragon-pin',
  html: '<div style="width:26px;height:26px;background:#B6F23E;border:4px solid #070818;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 6px 16px rgba(0,0,0,.5)"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
})

/** A still, dark map of one venue, for the quiz page. */
export default function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <MapContainer center={[lat, lng]} zoom={15} style={{ position: 'absolute', inset: 0 }} zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} touchZoom={false} keyboard={false}>
      <TileLayer className="dark-tiles" attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[lat, lng]} icon={pinIcon} interactive={false} />
    </MapContainer>
  )
}
