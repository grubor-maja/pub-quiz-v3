import { useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, X, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import {
  adminCreateQuiz, adminDeleteQuiz, adminFetchQuizzes, adminUpdateQuiz, adminFetchOrganizations,
} from '../../api'
import type { AdminQuizFilters, Quiz } from '../../types'
import Field, { inputStyle } from '../../components/admin/Field'
import { useSeo } from '../../lib/useSeo'
import {
  btnPrimary, btnGhost, btnGhostWide, rowStyle, emptyStyle,
  noticeStyle, overlayStyle, modalStyle, gridStyle,
} from './AdminOrganizationsPage'

type Draft = Partial<Quiz> & { organization_id?: string }

const STATUSES = ['published', 'draft', 'completed', 'cancelled'] as const

const STATUS_COLOR: Record<string, string> = {
  published: 'var(--accent-amber)',
  cancelled: '#f87171',
  draft: 'var(--text-muted)',
  completed: 'var(--text-muted)',
}

/** The API rejects "" where it expects null or a number. */
function clean(draft: Draft): Record<string, unknown> {
  const keep = [
    'organization_id', 'title', 'quiz_date', 'quiz_time', 'description',
    'location', 'address', 'entry_fee', 'min_team_members', 'max_team_members',
    'contact_phone', 'cover_image_url', 'instagram_post_url', 'status',
  ]
  const out: Record<string, unknown> = {}
  for (const k of keep) {
    const v = (draft as Record<string, unknown>)[k]
    if (v === undefined) continue
    out[k] = v === '' ? null : v
  }
  if (typeof out.quiz_date === 'string') out.quiz_date = (out.quiz_date as string).slice(0, 10)
  if (typeof out.quiz_time === 'string') out.quiz_time = (out.quiz_time as string).slice(0, 5)
  return out
}

export default function AdminQuizzesPage() {
  const qc = useQueryClient()
  const [filters, setFilters] = useState<AdminQuizFilters>({})
  const [draft, setDraft] = useState<Draft | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)

  useSeo({ title: 'Administracija kvizova', description: 'Interna stranica.', path: '/admin/kvizovi' })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-quizzes', filters],
    queryFn: () => adminFetchQuizzes(filters),
    placeholderData: keepPreviousData,
  })

  const { data: orgs } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: adminFetchOrganizations,
  })

  const done = (msg: string) => {
    qc.invalidateQueries({ queryKey: ['admin-quizzes'] })
    qc.invalidateQueries({ queryKey: ['quizzes'] })
    setDraft(null); setErrors({}); setNotice(msg)
  }

  const onError = (e: any) => {
    const d = e?.response?.data
    if (d?.errors) setErrors(Object.fromEntries(Object.entries(d.errors).map(([k, v]: any) => [k, v[0]])))
    else setNotice(d?.message ?? 'Greška pri čuvanju.')
  }

  const save = useMutation({
    mutationFn: (d: Draft) => d.id ? adminUpdateQuiz(d.id, clean(d) as Partial<Quiz>) : adminCreateQuiz(clean(d) as Partial<Quiz>),
    onSuccess: (_r, d) => done(d.id ? 'Kviz sačuvan.' : 'Kviz dodat.'),
    onError,
  })

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteQuiz(id),
    onSuccess: () => done('Kviz obrisan.'),
    onError,
  })

  const set = (k: string, v: unknown) => setDraft(d => ({ ...(d ?? {}), [k]: v }))
  const page = filters.page ?? 1

  return (
    <div className="page-pad" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="section-heading">
        <h1 className="sg" style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Kvizovi
        </h1>
        <button
          onClick={() => { setDraft({ status: 'published', organization_id: orgs?.[0]?.id }); setErrors({}) }}
          className="btn-amber"
          style={btnPrimary}
        >
          <Plus size={13} /> Dodaj
        </button>
      </div>

      {notice && <div style={noticeStyle} onClick={() => setNotice(null)}>{notice}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          style={{ ...inputStyle, maxWidth: 240 }}
          placeholder="Pretraži naziv ili lokaciju"
          value={filters.search ?? ''}
          onChange={e => setFilters(f => ({ ...f, search: e.target.value || undefined, page: 1 }))}
        />
        <select
          style={{ ...inputStyle, maxWidth: 190 }}
          value={filters.org ?? ''}
          onChange={e => setFilters(f => ({ ...f, org: e.target.value || undefined, page: 1 }))}
        >
          <option value="">Sve organizacije</option>
          {orgs?.map(o => <option key={o.id} value={o.slug}>{o.name}</option>)}
        </select>
        <select
          style={{ ...inputStyle, maxWidth: 150 }}
          value={filters.status ?? ''}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value || undefined, page: 1 }))}
        >
          <option value="">Svi statusi</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div style={emptyStyle}>Učitavanje...</div>
      ) : data?.data.length === 0 ? (
        <div style={emptyStyle}>Nema kvizova za zadate filtere.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data?.data.map(q => (
            <div key={q.id} style={rowStyle}>
              <div style={{
                width: 38, height: 38, borderRadius: 7, overflow: 'hidden', flexShrink: 0,
                background: 'var(--bg-elevated)',
              }}>
                {q.cover_image_url && (
                  <img src={q.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, color: 'var(--text-primary)', fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {q.title}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {q.quiz_date?.slice(0, 10) ?? 'bez datuma'}
                  {q.quiz_time ? ` · ${q.quiz_time.slice(0, 5)}` : ''}
                  {` · ${q.organization?.name ?? ''}`}
                  {q.location ? ` · ${q.location}` : ''}
                </div>
              </div>
              <span style={{
                fontSize: 10, padding: '3px 7px', borderRadius: 5, whiteSpace: 'nowrap',
                color: STATUS_COLOR[q.status] ?? 'var(--text-muted)',
                border: '0.5px solid var(--border-default)',
              }}>
                {q.status}
              </span>
              <a href={`/kvizovi/${q.slug}`} target="_blank" rel="noopener" style={btnGhost} title="Otvori">
                <ExternalLink size={14} />
              </a>
              <button onClick={() => { setDraft({ ...q, organization_id: q.organization?.id }); setErrors({}) }} style={btnGhost} title="Izmeni">
                <Pencil size={14} />
              </button>
              <button
                onClick={() => { if (confirm(`Obrisati kviz "${q.title}"?`)) remove.mutate(q.id) }}
                style={{ ...btnGhost, color: '#f87171' }}
                title="Obriši"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {data && data.last_page > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 }}>
          <button onClick={() => setFilters(f => ({ ...f, page: page - 1 }))} disabled={page === 1} style={btnGhostWide}>
            <ChevronLeft size={13} />
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{page} / {data.last_page}</span>
          <button onClick={() => setFilters(f => ({ ...f, page: page + 1 }))} disabled={page === data.last_page} style={btnGhostWide}>
            <ChevronRight size={13} />
          </button>
        </div>
      )}

      {draft && (
        <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) setDraft(null) }}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {draft.id ? 'Izmena kviza' : 'Novi kviz'}
              </h2>
              <button onClick={() => setDraft(null)} style={btnGhost}><X size={16} /></button>
            </div>

            <div style={gridStyle}>
              <Field label="Organizacija" error={errors.organization_id}>
                <select style={inputStyle} value={draft.organization_id ?? ''} onChange={e => set('organization_id', e.target.value)}>
                  <option value="">Izaberi</option>
                  {orgs?.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </Field>
              <Field label="Status" error={errors.status}>
                <select style={inputStyle} value={draft.status ?? 'published'} onChange={e => set('status', e.target.value)}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Naziv" error={errors.title}>
                <input style={inputStyle} value={draft.title ?? ''} onChange={e => set('title', e.target.value)} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Datum" error={errors.quiz_date}>
                  <input style={inputStyle} type="date" value={(draft.quiz_date ?? '').slice(0, 10)} onChange={e => set('quiz_date', e.target.value)} />
                </Field>
                <Field label="Vreme" error={errors.quiz_time}>
                  <input style={inputStyle} type="time" value={(draft.quiz_time ?? '').slice(0, 5)} onChange={e => set('quiz_time', e.target.value)} />
                </Field>
              </div>
              <Field label="Mesto" error={errors.location}>
                <input style={inputStyle} value={draft.location ?? ''} onChange={e => set('location', e.target.value)} />
              </Field>
              <Field label="Adresa" error={errors.address}>
                <input style={inputStyle} value={draft.address ?? ''} onChange={e => set('address', e.target.value)} />
              </Field>
              <Field label="Kotizacija" hint="Prazno = besplatno" error={errors.entry_fee}>
                <input style={inputStyle} type="number" value={draft.entry_fee ?? ''} onChange={e => set('entry_fee', e.target.value === '' ? null : Number(e.target.value))} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Min. članova" error={errors.min_team_members}>
                  <input style={inputStyle} type="number" value={draft.min_team_members ?? ''} onChange={e => set('min_team_members', e.target.value === '' ? null : Number(e.target.value))} />
                </Field>
                <Field label="Max. članova" hint="Prazno ako nije navedeno" error={errors.max_team_members}>
                  <input style={inputStyle} type="number" value={draft.max_team_members ?? ''} onChange={e => set('max_team_members', e.target.value === '' ? null : Number(e.target.value))} />
                </Field>
              </div>
              <Field label="Telefon" error={errors.contact_phone}>
                <input style={inputStyle} value={draft.contact_phone ?? ''} onChange={e => set('contact_phone', e.target.value)} />
              </Field>
              <Field label="Slika (URL)" hint="Prazno = kviz se briše dnevnim čišćenjem" error={errors.cover_image_url}>
                <input style={inputStyle} value={draft.cover_image_url ?? ''} onChange={e => set('cover_image_url', e.target.value)} />
              </Field>
            </div>

            <div style={{ marginTop: 12 }}>
              <Field label="Opis" error={errors.description}>
                <textarea
                  style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                  value={draft.description ?? ''}
                  onChange={e => set('description', e.target.value)}
                />
              </Field>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
              <button onClick={() => setDraft(null)} style={btnGhostWide}>Odustani</button>
              <button
                onClick={() => save.mutate(draft)}
                disabled={save.isPending}
                className="btn-amber"
                style={{ ...btnPrimary, opacity: save.isPending ? 0.6 : 1 }}
              >
                {save.isPending ? 'Čuvanje...' : 'Sačuvaj'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
