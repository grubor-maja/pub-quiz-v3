import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Link } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../api'
import type { Quiz } from '../types'
import { formatDate, formatTime, formatPrice } from '../lib/utils'

// Fix default marker icons for Vite bundling
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Custom amber marker
const amberIcon = L.divIcon({
  className: 'custom-map-marker',
  html: '<div class="marker-pin"></div>',
  iconSize: [26, 32],
  iconAnchor: [13, 32],
  popupAnchor: [0, -30],
})

interface MapQuiz extends Quiz {
  latitude: number
  longitude: number
}

export default function MapPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['quizzes-map'],
    queryFn: async () => {
      const res = await api.get<{ data: MapQuiz[] }>('/quizzes/map')
      return res.data.data
    },
    staleTime: 60 * 1000,
  })

  const quizzes = data ?? []
  const center: [number, number] = [44.8125, 20.4612] // Belgrade default
  const zoom = quizzes.length > 0 ? 12 : 8

  return (
    <div className="page-pad" style={{ maxWidth: 1180, margin: '0 auto' }}>
      <h1 style={{
        fontSize: 22,
        fontWeight: 600,
        color: 'var(--text-primary)',
        margin: '0 0 8px',
        letterSpacing: '-0.01em',
      }}>
        Mapa kvizova
      </h1>
      <p style={{
        fontSize: 12.5,
        color: 'var(--text-muted)',
        margin: '0 0 18px',
      }}>
        {isLoading
          ? 'Ucitavanje...'
          : quizzes.length === 0
            ? 'Nema pinova za prikaz. Pokreni geocoding komandom.'
            : `${quizzes.length} lokacija sa predstojecim kvizovima`
        }
      </p>

      {isError ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          Greska pri ucitavanju mape.
        </div>
      ) : (
        <div style={{
          height: '70vh',
          minHeight: 500,
          borderRadius: 12,
          overflow: 'hidden',
          border: '0.5px solid var(--border-subtle)',
        }}>
          <MapContainer
            center={center}
            zoom={zoom}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {quizzes.map(quiz => (
              <Marker
                key={quiz.id}
                position={[quiz.latitude, quiz.longitude]}
                icon={amberIcon}
              >
                <Popup>
                  <div style={{ minWidth: 200 }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      marginBottom: 6,
                      color: '#0B0B10',
                    }}>
                      {quiz.title.replace(/\s+\d{4}-\d{2}-\d{2}$/, '').trim()}
                    </div>
                    <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>
                      {formatDate(quiz.quiz_date)} · {quiz.quiz_time ? formatTime(quiz.quiz_time) + 'h' : ''}
                    </div>
                    <div style={{ fontSize: 11, color: '#555', marginBottom: 4 }}>
                      {quiz.location}{quiz.address ? `, ${quiz.address}` : ''}
                    </div>
                    <div style={{ fontSize: 11, color: '#555', marginBottom: 8 }}>
                      {formatPrice(quiz.entry_fee)} po timu
                    </div>
                    <Link
                      to={`/kvizovi/${quiz.slug}`}
                      style={{
                        display: 'inline-block',
                        padding: '5px 10px',
                        background: '#E9B84A',
                        color: '#0B0B10',
                        borderRadius: 5,
                        fontSize: 11,
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      Detalji
                    </Link>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </div>
  )
}
