import { useState, type ReactNode } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarPlus, ChevronDown, ChevronLeft, ChevronRight, LogIn, Pencil, RefreshCw, RotateCcw,
  Search, ShieldCheck, Trash2, Building2,
} from 'lucide-react'
import { adminFetchAudit, adminFetchOrganizations, adminRestoreFromAudit } from '../../api'
import type { AuditEntry, AuditFilters } from '../../types'
import { inputStyle } from '../../components/admin/Field'
import { useSeo } from '../../lib/useSeo'
import { errorMessage } from './adminStyles'
import { btnGhostWide, emptyStyle, noticeStyle } from './adminStyles'

type Tone = 'lime' | 'violet' | 'red' | 'muted'

const ACTIONS: Record<string, { verb: string; icon: ReactNode; tone: Tone }> = {
  'quiz.created': { verb: 'dodao/la kviz', icon: <CalendarPlus size={15} />, tone: 'lime' },
  'quiz.updated': { verb: 'izmenio/la kviz', icon: <Pencil size={15} />, tone: 'violet' },
  'quiz.deleted': { verb: 'obrisao/la kviz', icon: <Trash2 size={15} />, tone: 'red' },
  'quiz.restored': { verb: 'vratio/la obrisan kviz', icon: <RotateCcw size={15} />, tone: 'lime' },
  'organization.created': { verb: 'dodao/la organizaciju', icon: <Building2 size={15} />, tone: 'lime' },
  'organization.updated': { verb: 'izmenio/la organizaciju', icon: <Pencil size={15} />, tone: 'violet' },
  'organization.deleted': { verb: 'obrisao/la organizaciju', icon: <Trash2 size={15} />, tone: 'red' },
  'user.roles_changed': { verb: 'promenio/la uloge korisniku', icon: <ShieldCheck size={15} />, tone: 'violet' },
  'auth.login': { verb: 'se prijavio/la', icon: <LogIn size={15} />, tone: 'muted' },
  'sync.triggered': { verb: 'ručno pokrenuo/la Instagram sync', icon: <RefreshCw size={15} />, tone: 'muted' },
}

const TONES: Record<Tone, { bg: string; fg: string }> = {
  lime: { bg: 'rgba(182,242,62,0.14)', fg: 'var(--lime)' },
  violet: { bg: 'rgba(167,139,250,0.18)', fg: '#C4B5FD' },
  red: { bg: 'rgba(248,113,113,0.16)', fg: '#FCA5A5' },
  muted: { bg: 'var(--bg-elevated)', fg: 'var(--text-muted)' },
}

const FIELD_LABELS: Record<string, string> = {
  title: 'Naziv', name: 'Naziv', slug: 'Slug', quiz_date: 'Datum', quiz_time: 'Vreme', location: 'Mesto',
  address: 'Adresa', entry_fee: 'Kotizacija', min_team_members: 'Min. članova', max_team_members: 'Max. članova',
  contact_phone: 'Telefon', cover_image_url: 'Slika', instagram_post_url: 'Instagram objava', status: 'Status',
  description: 'Opis', organization_id: 'Organizacija', instagram_handle: 'Instagram', logo_url: 'Logo',
  dragon_color: 'Boja zmaja', dragon_prop: 'Rekvizit', dragon_shirt: 'Majica', latitude: 'Geo. širina', longitude: 'Geo. dužina',
  default_location: 'Podraz. mesto', default_address: 'Podraz. adresa', default_quiz_time: 'Podraz. vreme',
  default_entry_fee: 'Podraz. kotizacija', default_contact_phone: 'Podraz. telefon',
  default_min_team_members: 'Podraz. min.', default_max_team_members: 'Podraz. max.',
  dodato: 'Dodato', uklonjeno: 'Uklonjeno', pre: 'Pre izmene', iz_zapisa: 'Iz zapisa #',
}
const HIDDEN_FIELDS = new Set(['id'])

const time = (s: string) => new Date(s).toLocaleTimeString('sr-Latn-RS', { hour: '2-digit', minute: '2-digit' })
const day = (s: string) => new Date(s).toLocaleDateString('sr-Latn-RS', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const dayKey = (s: string) => new Date(s).toDateString()

function show(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—'
  if (typeof v === 'object') return JSON.stringify(v)
  const s = String(v)
  return s.length > 160 ? s.slice(0, 160) + '…' : s
}

export default function AdminAuditPage() {
  const qc = useQueryClient()
  const [filters, setFilters] = useState<AuditFilters>({})
  const [open, setOpen] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useSeo({ title: 'Audit log', description: 'Interna stranica.', path: '/admin/audit' })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-audit', filters],
    queryFn: () => adminFetchAudit(filters),
    placeholderData: keepPreviousData,
  })
  const { data: orgs } = useQuery({ queryKey: ['admin-organizations'], queryFn: adminFetchOrganizations })
  const orgName = (id: string | null) => (id && orgs?.find(o => o.id === id)?.name) || null

  const restore = useMutation({
    mutationFn: (id: number) => adminRestoreFromAudit(id),
    onSuccess: q => {
      qc.invalidateQueries({ queryKey: ['admin-audit'] })
      qc.invalidateQueries({ queryKey: ['admin-quizzes'] })
      qc.invalidateQueries({ queryKey: ['quizzes'] })
      setNotice(`Kviz „${q.title}“ je vraćen.`)
    },
    onError: (e: unknown) => setNotice(errorMessage(e) ?? 'Vraćanje nije uspelo.'),
  })

  const set = (k: keyof AuditFilters, v: string) => setFilters(f => ({ ...f, [k]: v || undefined, page: 1 }))
  const page = filters.page ?? 1
  let lastDay = ''

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="section-heading" style={{ marginTop: 12 }}>
        <h1 className="display" style={{ fontSize: 30, fontWeight: 700 }}>Audit log</h1>
        {data && <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{data.total} zapisa</span>}
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.55, margin: '-4px 0 18px', maxWidth: 720 }}>
        Sve izmene napravljene kroz admin: ko, šta, kada i sa koje adrese. Zapisi se ne mogu menjati ni brisati iz aplikacije.
        Obrisan kviz se vraća dugmetom „Vrati“. Automatski scraping se ovde ne beleži.
      </p>

      {notice && <div role="status" style={noticeStyle} onClick={() => setNotice(null)}>{notice}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 340 }}>
          <Search size={16} aria-hidden="true" style={{ position: 'absolute', left: 12, top: 14, color: 'var(--text-muted)' }} />
          <input style={{ ...inputStyle, paddingLeft: 36 }} placeholder="Ko ili šta (ime, email, kviz)" aria-label="Pretraga" value={filters.search ?? ''} onChange={e => set('search', e.target.value)} />
        </div>
        <select style={{ ...inputStyle, maxWidth: 230 }} aria-label="Radnja" value={filters.action ?? ''} onChange={e => set('action', e.target.value)}>
          <option value="">Sve radnje</option>
          {Object.entries(ACTIONS).map(([k, a]) => <option key={k} value={k}>{a.verb.replace('/la', '')}</option>)}
        </select>
        <select style={{ ...inputStyle, maxWidth: 210 }} aria-label="Organizacija" value={filters.organization_id ?? ''} onChange={e => set('organization_id', e.target.value)}>
          <option value="">Sve organizacije</option>
          {orgs?.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <input type="date" style={{ ...inputStyle, maxWidth: 160 }} aria-label="Od datuma" value={filters.date_from ?? ''} onChange={e => set('date_from', e.target.value)} />
        <input type="date" style={{ ...inputStyle, maxWidth: 160 }} aria-label="Do datuma" value={filters.date_to ?? ''} onChange={e => set('date_to', e.target.value)} />
      </div>

      {isLoading ? (
        <div style={emptyStyle}>Učitavanje…</div>
      ) : data?.data.length === 0 ? (
        <div style={emptyStyle}>Nema zapisa za zadate filtere.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data?.data.map(e => {
            const header = dayKey(e.created_at) !== lastDay
            lastDay = dayKey(e.created_at)
            return (
              <div key={e.id}>
                {header && (
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '14px 0 8px' }}>
                    {day(e.created_at)}
                  </div>
                )}
                <Row
                  entry={e}
                  org={orgName(e.organization_id)}
                  expanded={open === e.id}
                  onToggle={() => setOpen(o => (o === e.id ? null : e.id))}
                  onRestore={() => restore.mutate(e.id)}
                  restoring={restore.isPending && restore.variables === e.id}
                />
              </div>
            )
          })}
        </div>
      )}

      {data && data.last_page > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 }}>
          <button onClick={() => setFilters(f => ({ ...f, page: page - 1 }))} disabled={page === 1} style={btnGhostWide} aria-label="Novije"><ChevronLeft size={15} /></button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{page} / {data.last_page}</span>
          <button onClick={() => setFilters(f => ({ ...f, page: page + 1 }))} disabled={page === data.last_page} style={btnGhostWide} aria-label="Starije"><ChevronRight size={15} /></button>
        </div>
      )}
    </div>
  )
}

function Row({ entry: e, org, expanded, onToggle, onRestore, restoring }: {
  entry: AuditEntry; org: string | null; expanded: boolean
  onToggle: () => void; onRestore: () => void; restoring: boolean
}) {
  const a = ACTIONS[e.action] ?? { verb: e.action, icon: <Pencil size={15} />, tone: 'muted' as Tone }
  const tone = TONES[a.tone]
  const who = e.user_name ?? (e.action === 'sync.triggered' ? 'API ključ' : 'Nepoznato')
  const hasDetails = !!e.changes || !!e.ip

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', width: 42, fontVariantNumeric: 'tabular-nums' }}>{time(e.created_at)}</span>
        <span aria-hidden="true" style={{ width: 30, height: 30, flex: 'none', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tone.bg, color: tone.fg }}>
          {a.icon}
        </span>
        <div style={{ flex: '1 1 300px', minWidth: 0, fontSize: 14.5, lineHeight: 1.45 }}>
          <strong style={{ fontWeight: 600 }}>{who}</strong>{' '}
          <span style={{ color: 'var(--text-tertiary)' }}>{a.verb}</span>{' '}
          {e.subject_label && <strong style={{ fontWeight: 600, color: e.action.endsWith('deleted') ? '#FCA5A5' : 'var(--text-primary)' }}>{e.subject_label}</strong>}
          {org && e.subject_type === 'quiz' && <span style={{ color: 'var(--text-muted)' }}> · {org}</span>}
        </div>
        {e.restorable && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onRestore} disabled={restoring}>
            <RotateCcw size={14} aria-hidden="true" /> {restoring ? 'Vraćam…' : 'Vrati'}
          </button>
        )}
        {hasDetails && (
          <button type="button" className="icon-btn" onClick={onToggle} aria-expanded={expanded} aria-label="Detalji">
            <ChevronDown size={16} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </button>
        )}
      </div>
      {expanded && <Details entry={e} />}
    </div>
  )
}

function Details({ entry: e }: { entry: AuditEntry }) {
  const changes = e.changes ?? {}
  const isDiff = e.action.endsWith('.updated')
  const rows = Object.entries(changes).filter(([k, v]) => !HIDDEN_FIELDS.has(k) && (isDiff || (v !== null && v !== '' && !(Array.isArray(v) && v.length === 0))))

  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '12px 14px 14px 68px', fontSize: 13.5, background: 'rgba(7,8,24,0.45)' }}>
      {rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 420 }}>
            {isDiff && (
              <thead>
                <tr style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'left' }}>
                  <th style={th}>Polje</th><th style={th}>Bilo je</th><th style={th}>Sada je</th>
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map(([k, v]) => {
                const label = FIELD_LABELS[k] ?? k
                if (isDiff && v && typeof v === 'object' && 'old' in (v as object)) {
                  const d = v as { old: unknown; new: unknown }
                  return (
                    <tr key={k}>
                      <td style={{ ...td, color: 'var(--text-muted)', width: 150 }}>{label}</td>
                      <td style={{ ...td, color: '#FCA5A5', textDecoration: 'line-through', textDecorationColor: 'rgba(252,165,165,0.5)' }}>{show(d.old)}</td>
                      <td style={{ ...td, color: 'var(--lime-light)' }}>{show(d.new)}</td>
                    </tr>
                  )
                }
                return (
                  <tr key={k}>
                    <td style={{ ...td, color: 'var(--text-muted)', width: 150 }}>{label}</td>
                    <td style={td} colSpan={2}>{show(v)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ color: 'var(--text-muted)', fontSize: 12.5, marginTop: rows.length ? 10 : 0, lineHeight: 1.6, wordBreak: 'break-word' }}>
        {e.user_email && <>Nalog: {e.user_email} · </>}
        IP: {e.ip ?? '—'} · Zapis #{e.id} · {new Date(e.created_at).toLocaleString('sr-Latn-RS')}
        {e.user_agent && <div>{e.user_agent}</div>}
      </div>
    </div>
  )
}

const th: React.CSSProperties = { padding: '4px 10px 6px 0', fontWeight: 600 }
const td: React.CSSProperties = { padding: '5px 10px 5px 0', verticalAlign: 'top', borderTop: '1px solid rgba(255,255,255,0.05)' }
