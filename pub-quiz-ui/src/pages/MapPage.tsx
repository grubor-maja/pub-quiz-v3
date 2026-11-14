import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import { Link } from 'react-router-dom'
import { renderToStaticMarkup } from 'react-dom/server'
import { Locate, X } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api, { fetchOrganizations } from '../api'
import PinFlag from '../components/PinFlag'
import { OrgBadge } from '../components/OrgBadge'
import EmptyState from '../components/EmptyState'
import OrgMultiSelect from '../components/OrgMultiSelect'
import type { Quiz } from '../types'
import { addDays, cleanTitle, endOfWeekIso, formatTime, kvizWord, placeLabel, relativeDay, todayIso, weekendIso } from '../lib/utils'
import { useGeo } from '../lib/useGeo'
import { useSeo } from '../lib/useSeo'

interface MapQuiz extends Quiz {
  latitude: number
  longitude: number
}

type When = 'sve' | 'danas' | 'sutra' | 'vikend' | 'nedelja'
const WHEN: { key: When; label: string }[] = [
  { key: 'danas', label: 'Večeras' },
  { key: 'sutra', label: 'Sutra' },
  { key: 'vikend', label: 'Vikend' },
  { key: 'nedelja', label: 'Ove nedelje' },
  { key: 'sve', label: 'Sve' },
]
const RADII = [2, 5, 10, 25] as const

function rangeFor(w: When): { from?: string; to?: string } {
  const t = todayIso()
  switch (w) {
    case 'danas': return { from: t, to: t }
    case 'sutra': return { from: addDays(t, 1), to: addDays(t, 1) }
    case 'vikend': return weekendIso()
    case 'nedelja': return { from: t, to: endOfWeekIso() }
    default: return {}
  }
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(a))
}

function pinIcon(org: Quiz['organization'], count: number, selected: boolean) {
  const html = renderToStaticMarkup(
    <div className="dragon-pin-inner">
      <PinFlag org={org} />
      {count > 1 && <span className="dragon-pin-count">{count}</span>}
    </div>,
  )
  return L.divIcon({ className: `dragon-pin${selected ? ' selected' : ''}`, html, iconSize: [70, 52], iconAnchor: [22, 50] })
}

const userIcon = L.divIcon({ className: 'user-location-marker', html: '<div class="user-location-dot"></div>', iconSize: [20, 20], iconAnchor: [10, 10] })

function AutoFit({ points }: { points: [number, number][] }) {
  const map = useMap()
  const key = points.map(p => p.join(',')).join(';')
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) { map.setView(points[0], 14); return }
    map.fitBounds(L.latLngBounds(points as L.LatLngExpression[]), { padding: [50, 50], maxZoom: 15 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key])
  return null
}

function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => { if (target) map.flyTo(target, Math.max(map.getZoom(), 14), { duration: 0.6 }) }, [map, target])
  return null
}

export default function MapPage() {
  const [when, setWhen] = useState<When>('nedelja')
  const [orgFilter, setOrgFilter] = useState<string[]>([])
  const [radius, setRadius] = useState<number | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const geo = useGeo()
  const mapAreaRef = useRef<HTMLElement>(null)

  // On a phone the map sits above the list, so picking a quiz further down
  // moved the map and opened its card off screen, and the tap looked dead.
  // Bring the map back into view with the card in it.
  const pickFromList = (id: string) => {
    setSelected(id)
    if (window.innerWidth < 900) mapAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // On desktop the page fills exactly the window below the nav: the list
  // scrolls on its own and the selected-quiz card in the map's corner is
  // always in view. Measured rather than hard-coded so a taller nav (or the
  // iOS safe area) cannot push the page into scrolling again.
  const pageRef = useRef<HTMLDivElement>(null)
  const [fitHeight, setFitHeight] = useState<number | null>(null)
  useLayoutEffect(() => {
    const fit = () => {
      if (!pageRef.current || window.innerWidth < 900) { setFitHeight(null); return }
      setFitHeight(Math.max(420, window.innerHeight - pageRef.current.getBoundingClientRect().top - window.scrollY))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  useSeo({
    title: 'Mapa kvizova',
    description: 'Mapa pab kvizova u Srbiji. Pronađi kviz blizu sebe po datumu, organizatoru i udaljenosti.',
    path: '/mapa',
  })

  const { data: orgs } = useQuery({ queryKey: ['organizations'], queryFn: fetchOrganizations, staleTime: 5 * 60 * 1000 })
  const range = rangeFor(when)
  const { data: raw, isLoading, isError } = useQuery({
    queryKey: ['quizzes-map', orgFilter.join(','), when],
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (orgFilter.length) params.org = orgFilter.join(',')
      if (range.from) params.date_from = range.from
      if (range.to) params.date_to = range.to
      const res = await api.get<{ data: MapQuiz[] }>('/quizzes/map', { params })
      return res.data.data
        .map(q => ({ ...q, latitude: Number(q.latitude), longitude: Number(q.longitude) }))
        .filter(q => (q.quiz_date ?? '').slice(0, 10) >= todayIso())
    },
    staleTime: 60 * 1000,
  })

  const quizzes = useMemo(() => {
    const list = raw ?? []
    if (!geo.pos || !radius) return list
    return list.filter(q => distanceKm(geo.pos!.lat, geo.pos!.lng, q.latitude, q.longitude) <= radius)
  }, [raw, geo.pos, radius])

  const groups = useMemo(() => {
    const m = new Map<string, MapQuiz[]>()
    for (const q of quizzes) {
      const k = `${q.latitude.toFixed(5)},${q.longitude.toFixed(5)}`
      m.set(k, [...(m.get(k) ?? []), q])
    }
    return [...m.values()].map(list => ({ lat: list[0].latitude, lng: list[0].longitude, quizzes: list }))
  }, [quizzes])

  const sel = quizzes.find(q => q.id === selected) ?? null
  const points: [number, number][] = groups.map(g => [g.lat, g.lng])
  const flyTarget: [number, number] | null = sel ? [sel.latitude, sel.longitude] : null

  return (
    <div ref={pageRef} className="map-page" style={{ display: 'flex', flexWrap: 'wrap', ...(fitHeight ? { height: fitHeight } : { minHeight: 'calc(100vh - 64px)' }) }}>
      <aside className="map-aside" style={{ flex: '1 1 340px', padding: '22px 20px 120px', borderRight: '1px solid var(--border-subtle)', background: 'rgba(10,11,34,0.85)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <h1 className="display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Kvizovi na mapi</h1>

        <div role="group" aria-label="Kada" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {WHEN.map(w => (
            <button key={w.key} type="button" aria-pressed={when === w.key} onClick={() => { setWhen(w.key); setSelected(null) }} className="chip"
              style={when === w.key ? { background: 'var(--lime)', color: 'var(--on-lime)', borderColor: 'var(--lime)', fontWeight: 600 } : undefined}>
              {w.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {geo.pos ? (
            <>
              {RADII.map(r => (
                <button key={r} type="button" className={`chip${radius === r ? ' on' : ''}`} aria-pressed={radius === r} onClick={() => setRadius(radius === r ? null : r)}>do {r} km</button>
              ))}
              <button type="button" className="chip" onClick={() => { geo.clear(); setRadius(null) }} aria-label="Ukloni moju lokaciju"><X size={14} aria-hidden="true" /> Lokacija</button>
            </>
          ) : (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { geo.request(); setRadius(10) }} disabled={geo.status === 'asking'}>
              <Locate size={16} aria-hidden="true" />{geo.status === 'asking' ? 'Tražim…' : 'Blizu mene'}
            </button>
          )}
        </div>
        {geo.message && <p style={{ fontSize: 13, color: '#FFB3C1' }}>{geo.message}</p>}

        {orgs && orgs.length > 0 && (
          <OrgMultiSelect orgs={orgs} selected={orgFilter} onChange={slugs => { setOrgFilter(slugs); setSelected(null) }} />
        )}

        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {isLoading ? 'Učitavanje…' : `${quizzes.length} ${kvizWord(quizzes.length)} na mapi`}
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {quizzes.map(q => {
            const on = q.id === selected
            return (
              <button key={q.id} type="button" onClick={() => pickFromList(q.id)} aria-pressed={on} style={{
                display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '10px 12px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                background: on ? 'rgba(182,242,62,0.08)' : 'transparent', border: `1px solid ${on ? 'rgba(182,242,62,0.4)' : 'var(--border-subtle)'}`, color: 'var(--text-primary)',
              }}>
                <OrgBadge org={q.organization} size={40} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cleanTitle(q.title)}</span>
                  <span style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {relativeDay(q.quiz_date)}{q.quiz_time ? ` ${formatTime(q.quiz_time)}` : ''} · {placeLabel(q)}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        {!isLoading && quizzes.length === 0 && (
          <EmptyState title="Nema kvizova na mapi" text="Promeni datum ili udaljenost. Na mapi su samo kvizovi čija je adresa pronađena." />
        )}
      </aside>

      <section ref={mapAreaRef} aria-label="Mapa" className="map-area" style={{ flex: '999 1 560px', position: 'relative', scrollMarginTop: 72 }}>
        {isError ? (
          <div style={{ padding: 60 }}><EmptyState title="Mapa nije učitana" text="Probaj ponovo za koji trenutak." /></div>
        ) : (
          <MapContainer center={geo.pos ? [geo.pos.lat, geo.pos.lng] : [44.8125, 20.4612]} zoom={12} style={{ position: 'absolute', inset: 0 }} scrollWheelZoom>
            <TileLayer
              className="dark-tiles"
              attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <AutoFit points={points} />
            <FlyTo target={flyTarget} />
            {geo.pos && <Marker position={[geo.pos.lat, geo.pos.lng]} icon={userIcon} />}
            {groups.map(g => {
              const isSel = g.quizzes.some(q => q.id === selected)
              return (
                <Marker
                  key={`${g.lat},${g.lng}`}
                  position={[g.lat, g.lng]}
                  icon={pinIcon(g.quizzes[0].organization, g.quizzes.length, isSel)}
                  eventHandlers={{ click: () => setSelected(g.quizzes[0].id) }}
                  title={g.quizzes.map(q => cleanTitle(q.title)).join(', ')}
                />
              )
            })}
          </MapContainer>
        )}

        {sel && (
          <div className="anim-up" style={{
            position: 'absolute', right: 16, bottom: 16, zIndex: 900, width: 'min(340px, calc(100% - 32px))', display: 'flex', gap: 14, padding: 12, borderRadius: 20,
            background: 'rgba(13,15,42,0.96)', border: '1px solid rgba(182,242,62,0.35)', backdropFilter: 'blur(12px)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          }}>
            {sel.cover_image_url && <img src={sel.cover_image_url} alt="" onError={e => { e.currentTarget.style.display = 'none' }} style={{ width: 88, aspectRatio: '4 / 5', objectFit: 'cover', borderRadius: 12, flex: 'none' }} />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--lime)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {relativeDay(sel.quiz_date)}{sel.quiz_time ? ` · ${formatTime(sel.quiz_time)}` : ''}
              </span>
              <span className="display" style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.15 }}>{cleanTitle(sel.title)}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{sel.organization.name} · {placeLabel(sel)}</span>
              <Link to={`/kvizovi/${sel.slug}`} style={{ marginTop: 'auto', fontSize: 14, fontWeight: 700, color: 'var(--lime)', textDecoration: 'none' }}>Detalji →</Link>
            </div>
            <button type="button" className="icon-btn" aria-label="Zatvori" onClick={() => setSelected(null)} style={{ width: 36, height: 36, flex: 'none' }}><X size={16} /></button>
          </div>
        )}
      </section>
    </div>
  )
}
