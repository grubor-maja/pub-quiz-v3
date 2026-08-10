import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { MapPin, Locate } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api, { fetchOrganizations } from '../api'
import OrgChipsBar from '../components/OrgChipsBar'
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

interface MapQuiz extends Quiz {
  latitude: number
  longitude: number
}

type DateFilter = 'all' | 'today' | 'tomorrow' | 'weekend' | 'week'
type RadiusFilter = 0 | 5 | 10 | 25 | 50

/** Haversine distance in km */
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function computeDateRange(filter: DateFilter): { from?: string; to?: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)

  switch (filter) {
    case 'today':
      return { from: isoDate(today), to: isoDate(today) }
    case 'tomorrow':
      return { from: isoDate(tomorrow), to: isoDate(tomorrow) }
    case 'weekend': {
      const day = today.getDay() // 0=Sun, 6=Sat
      const daysUntilSat = (6 - day + 7) % 7
      const sat = new Date(today); sat.setDate(today.getDate() + daysUntilSat)
      const sun = new Date(sat); sun.setDate(sat.getDate() + 1)
      return { from: isoDate(sat), to: isoDate(sun) }
    }
    case 'week': {
      // Monday-Sunday of current week
      const day = today.getDay() // 0=Sun ... 6=Sat
      const daysFromMon = (day + 6) % 7 // 0 if Mon, 6 if Sun
      const mon = new Date(today); mon.setDate(today.getDate() - daysFromMon)
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      return { from: isoDate(mon), to: isoDate(sun) }
    }
    default:
      return {}
  }
}

/** Fit map bounds to given points */
function AutoFit({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 14)
      return
    }
    const bounds = L.latLngBounds(points as L.LatLngExpression[])
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
  }, [map, points])
  return null
}

export default function MapPage() {
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([])
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [radius, setRadius] = useState<RadiusFilter>(0)
  const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState<string | null>(null)

  const { data: orgs } = useQuery({
    queryKey: ['organizations'],
    queryFn: fetchOrganizations,
    staleTime: 5 * 60 * 1000,
  })

  const dateRange = useMemo(() => computeDateRange(dateFilter), [dateFilter])

  const { data: rawQuizzes, isLoading, isError } = useQuery({
    queryKey: ['quizzes-map', selectedOrgs.join(','), dateFilter],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (selectedOrgs.length > 0) params.org = selectedOrgs.join(',')
      if (dateRange.from) params.date_from = dateRange.from
      if (dateRange.to) params.date_to = dateRange.to
      const res = await api.get<{ data: MapQuiz[] }>('/quizzes/map', { params })
      return res.data.data.map(q => ({
        ...q,
        latitude: Number(q.latitude),
        longitude: Number(q.longitude),
      }))
    },
    staleTime: 60 * 1000,
  })

  // Apply "near me" radius filter client-side
  const quizzes = useMemo(() => {
    if (!rawQuizzes) return []
    if (!userLoc || radius === 0) return rawQuizzes
    return rawQuizzes.filter(q => distanceKm(userLoc.lat, userLoc.lon, q.latitude, q.longitude) <= radius)
  }, [rawQuizzes, userLoc, radius])

  // Group by rounded coord (~1m precision)
  const groups = useMemo(() => {
    const map = new Map<string, MapQuiz[]>()
    for (const q of quizzes) {
      const key = `${q.latitude.toFixed(5)},${q.longitude.toFixed(5)}`
      const existing = map.get(key) ?? []
      existing.push(q)
      map.set(key, existing)
    }
    return Array.from(map.entries()).map(([key, list]) => {
      const [lat, lon] = key.split(',').map(Number)
      return { lat, lon, quizzes: list }
    })
  }, [quizzes])

  const points: [number, number][] = groups.map(g => [g.lat, g.lon])
  const center: [number, number] = userLoc ? [userLoc.lat, userLoc.lon] : [44.8125, 20.4612]

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setLocError('Geolokacija nije podrzana u ovom browseru.')
      return
    }
    setLocating(true)
    setLocError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lon: pos.coords.longitude })
        if (radius === 0) setRadius(25) // default to 25km when locating
        setLocating(false)
      },
      (err) => {
        setLocError(err.code === 1 ? 'Odbijena dozvola za lokaciju.' : 'Ne mogu da dobavim lokaciju.')
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    )
  }

  return (
    <div className="page-pad" style={{ maxWidth: 1180, margin: '0 auto' }}>
      <h1 style={{
        fontSize: 22,
        fontWeight: 600,
        color: 'var(--text-primary)',
        margin: '0 0 16px',
        letterSpacing: '-0.01em',
      }}>
        Mapa kvizova
      </h1>

      {/* Filter bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        marginBottom: 14,
      }}>
        <select
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value as DateFilter)}
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '0.5px solid var(--border-default)',
            borderRadius: 8,
            padding: '9px 12px',
            fontSize: 13,
            color: 'var(--text-primary)',
            cursor: 'pointer',
          }}
        >
          <option value="all">Sve datume</option>
          <option value="today">Danas</option>
          <option value="tomorrow">Sutra</option>
          <option value="weekend">Vikend</option>
          <option value="week">Ove nedelje</option>
        </select>

        <button
          onClick={handleLocate}
          disabled={locating}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 13px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            border: userLoc ? '0.5px solid rgba(233,184,74,0.4)' : '0.5px solid var(--border-default)',
            background: userLoc ? 'var(--accent-amber-soft)' : 'rgba(255,255,255,0.03)',
            color: userLoc ? 'var(--accent-amber)' : 'var(--text-secondary)',
            opacity: locating ? 0.6 : 1,
          }}
        >
          <Locate size={13} />
          {userLoc ? 'Blizu mene' : locating ? 'Trazim...' : 'Blizu mene'}
        </button>

        {userLoc && (
          <select
            value={radius}
            onChange={e => setRadius(Number(e.target.value) as RadiusFilter)}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid var(--border-default)',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 13,
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <option value={0}>Bilo koja razdaljina</option>
            <option value={5}>≤ 5 km</option>
            <option value={10}>≤ 10 km</option>
            <option value={25}>≤ 25 km</option>
            <option value={50}>≤ 50 km</option>
          </select>
        )}

        {userLoc && (
          <button
            onClick={() => { setUserLoc(null); setRadius(0); setLocError(null) }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: 12,
              cursor: 'pointer',
              padding: '4px 6px',
            }}
          >
            Ocisti lokaciju
          </button>
        )}
      </div>

      {locError && (
        <div style={{ fontSize: 12, color: '#ef4444', marginBottom: 10 }}>{locError}</div>
      )}

      {/* Org chips */}
      <OrgChipsBar
        orgs={orgs}
        selected={selectedOrgs}
        onToggle={(slug) =>
          setSelectedOrgs(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
        }
        onClearAll={() => setSelectedOrgs([])}
      />

      <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 12px' }}>
        {isLoading
          ? 'Ucitavanje...'
          : quizzes.length === 0
            ? 'Nema kvizova za zadate filtere.'
            : `${groups.length} lokacija · ${quizzes.length} kvizova`
        }
      </div>

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
            zoom={userLoc ? 12 : 11}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <AutoFit points={points} />

            {/* User location marker */}
            {userLoc && (
              <Marker
                position={[userLoc.lat, userLoc.lon]}
                icon={L.divIcon({
                  className: 'user-location-marker',
                  html: '<div class="user-location-dot"></div>',
                  iconSize: [20, 20],
                  iconAnchor: [10, 10],
                })}
              >
                <Popup>Ovde sam</Popup>
              </Marker>
            )}

            {/* Grouped quiz pins */}
            {groups.map((group, i) => (
              <Marker
                key={`${group.lat},${group.lon},${i}`}
                position={[group.lat, group.lon]}
                icon={L.divIcon({
                  className: 'custom-map-marker',
                  html: `<div class="marker-pin"></div>${group.quizzes.length > 1 ? `<div class="marker-badge">${group.quizzes.length}</div>` : ''}`,
                  iconSize: [26, 32],
                  iconAnchor: [13, 32],
                  popupAnchor: [0, -30],
                })}
              >
                <Popup maxWidth={280}>
                  <div style={{ minWidth: 220 }}>
                    <div style={{
                      fontSize: 12,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      color: '#0B0B10',
                      marginBottom: 8,
                      paddingBottom: 6,
                      borderBottom: '1px solid #E5E5E5',
                    }}>
                      {group.quizzes[0].location ?? group.quizzes[0].address}
                      {group.quizzes.length > 1 && (
                        <span style={{ fontWeight: 400, color: '#666', marginLeft: 6 }}>
                          · {group.quizzes.length} kvizova
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
                      {group.quizzes.map(q => (
                        <Link
                          key={q.id}
                          to={`/kvizovi/${q.slug}`}
                          style={{
                            display: 'block',
                            padding: 8,
                            background: '#F5F5F5',
                            borderRadius: 6,
                            textDecoration: 'none',
                            color: '#0B0B10',
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>
                            {q.title.replace(/\s+\d{4}-\d{2}-\d{2}$/, '').trim()}
                          </div>
                          <div style={{ fontSize: 11, color: '#555' }}>
                            {formatDate(q.quiz_date)} · {q.quiz_time ? formatTime(q.quiz_time) + 'h' : ''} · {formatPrice(q.entry_fee)}
                          </div>
                        </Link>
                      ))}
                    </div>
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
