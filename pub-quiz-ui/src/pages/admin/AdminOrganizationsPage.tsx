import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Pencil, X, Building2 } from 'lucide-react'
import {
  adminCreateOrganization,
  adminDeleteOrganization,
  adminFetchOrganizations,
  adminUpdateOrganization,
} from '../../api'
import type { AdminOrganization } from '../../types'
import Field, { inputStyle } from '../../components/admin/Field'
import { useSeo } from '../../lib/useSeo'

type Draft = Partial<AdminOrganization>

const EMPTY: Draft = {
  name: '', slug: '', instagram_handle: '', logo_url: '', description: '',
  default_location: '', default_address: '', default_quiz_time: '',
  default_entry_fee: null, default_contact_phone: '',
  default_min_team_members: null, default_max_team_members: null,
}

/** Empty strings would be stored as "" where the extraction expects null. */
function clean(draft: Draft): Draft {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(draft)) {
    if (k === 'id' || k === 'created_at' || k === 'updated_at' || k === 'quizzes_count') continue
    out[k] = v === '' ? null : v
  }
  return out as Draft
}

export default function AdminOrganizationsPage() {
  const qc = useQueryClient()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)

  useSeo({ title: 'Administracija organizacija', description: 'Interna stranica.', path: '/admin/organizacije' })

  const { data: orgs, isLoading } = useQuery({
    queryKey: ['admin-organizations'],
    queryFn: adminFetchOrganizations,
  })

  const done = (msg: string) => {
    qc.invalidateQueries({ queryKey: ['admin-organizations'] })
    qc.invalidateQueries({ queryKey: ['organizations'] })
    setDraft(null)
    setErrors({})
    setNotice(msg)
  }

  const onError = (e: any) => {
    const data = e?.response?.data
    if (data?.errors) {
      setErrors(Object.fromEntries(Object.entries(data.errors).map(([k, v]: any) => [k, v[0]])))
    } else {
      setNotice(data?.message ?? 'Greška pri čuvanju.')
    }
  }

  const save = useMutation({
    mutationFn: (d: Draft) => d.id
      ? adminUpdateOrganization(d.id, clean(d))
      : adminCreateOrganization(clean(d)),
    onSuccess: (_r, d) => done(d.id ? 'Organizacija sačuvana.' : 'Organizacija dodata.'),
    onError,
  })

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteOrganization(id),
    onSuccess: () => done('Organizacija obrisana.'),
    onError,
  })

  const set = (k: keyof AdminOrganization, v: unknown) =>
    setDraft(d => ({ ...(d ?? {}), [k]: v }))

  return (
    <div className="page-pad" style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div className="section-heading">
        <h1 className="sg" style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
          Organizacije
        </h1>
        <button onClick={() => { setDraft({ ...EMPTY }); setErrors({}) }} className="btn-amber" style={btnPrimary}>
          <Plus size={13} /> Dodaj
        </button>
      </div>

      {notice && (
        <div style={noticeStyle} onClick={() => setNotice(null)}>{notice}</div>
      )}

      {isLoading ? (
        <div style={emptyStyle}>Učitavanje...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orgs?.map(o => (
            <div key={o.id} style={rowStyle}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {o.logo_url
                  ? <img src={o.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <Building2 size={15} style={{ color: 'var(--accent-amber)' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{o.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {o.slug}
                  {o.instagram_handle ? ` · @${o.instagram_handle}` : ''}
                  {` · ${o.quizzes_count ?? 0} kvizova`}
                </div>
              </div>
              <button onClick={() => { setDraft({ ...o }); setErrors({}) }} style={btnGhost} title="Izmeni">
                <Pencil size={14} />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Obrisati organizaciju "${o.name}"?`)) remove.mutate(o.id)
                }}
                style={{ ...btnGhost, color: '#f87171' }}
                title="Obriši"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {draft && (
        <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) setDraft(null) }}>
          <div style={modalStyle}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {draft.id ? 'Izmena organizacije' : 'Nova organizacija'}
              </h2>
              <button onClick={() => setDraft(null)} style={btnGhost}><X size={16} /></button>
            </div>

            <div style={gridStyle}>
              <Field label="Naziv" error={errors.name}>
                <input style={inputStyle} value={draft.name ?? ''} onChange={e => set('name', e.target.value)} />
              </Field>
              <Field label="Slug" hint="Ostavi prazno da se izvede iz naziva" error={errors.slug}>
                <input style={inputStyle} value={draft.slug ?? ''} onChange={e => set('slug', e.target.value)} placeholder="npr. pab-kviz-8x8" />
              </Field>
              <Field label="Instagram handle" hint="Bez @" error={errors.instagram_handle}>
                <input style={inputStyle} value={draft.instagram_handle ?? ''} onChange={e => set('instagram_handle', e.target.value)} />
              </Field>
              <Field label="Logo URL" error={errors.logo_url}>
                <input style={inputStyle} value={draft.logo_url ?? ''} onChange={e => set('logo_url', e.target.value)} placeholder="/images/logo-x.jpg" />
              </Field>
            </div>

            <p style={sectionNote}>
              Podrazumevane vrednosti se koriste samo kada objava ne navodi podatak.
              Ostavi prazno ako se menja od kviza do kviza.
            </p>

            <div style={gridStyle}>
              <Field label="Podrazumevano mesto" error={errors.default_location}>
                <input style={inputStyle} value={draft.default_location ?? ''} onChange={e => set('default_location', e.target.value)} />
              </Field>
              <Field label="Podrazumevana adresa" error={errors.default_address}>
                <input style={inputStyle} value={draft.default_address ?? ''} onChange={e => set('default_address', e.target.value)} />
              </Field>
              <Field label="Podrazumevano vreme" hint="HH:MM" error={errors.default_quiz_time}>
                <input style={inputStyle} value={(draft.default_quiz_time ?? '').slice(0, 5)} onChange={e => set('default_quiz_time', e.target.value)} placeholder="20:30" />
              </Field>
              <Field label="Podrazumevana kotizacija" error={errors.default_entry_fee}>
                <input style={inputStyle} type="number" value={draft.default_entry_fee ?? ''} onChange={e => set('default_entry_fee', e.target.value === '' ? null : Number(e.target.value))} />
              </Field>
              <Field label="Podrazumevani telefon" error={errors.default_contact_phone}>
                <input style={inputStyle} value={draft.default_contact_phone ?? ''} onChange={e => set('default_contact_phone', e.target.value)} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Field label="Min. članova" error={errors.default_min_team_members}>
                  <input style={inputStyle} type="number" value={draft.default_min_team_members ?? ''} onChange={e => set('default_min_team_members', e.target.value === '' ? null : Number(e.target.value))} />
                </Field>
                <Field label="Max. članova" error={errors.default_max_team_members}>
                  <input style={inputStyle} type="number" value={draft.default_max_team_members ?? ''} onChange={e => set('default_max_team_members', e.target.value === '' ? null : Number(e.target.value))} />
                </Field>
              </div>
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

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
  borderRadius: 8, border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
}
const btnGhost: React.CSSProperties = {
  background: 'none', border: 'none', color: 'var(--text-muted)',
  cursor: 'pointer', padding: 6, display: 'inline-flex', alignItems: 'center',
}
const btnGhostWide: React.CSSProperties = {
  ...btnGhost, padding: '8px 14px', border: '0.5px solid var(--border-default)',
  borderRadius: 8, fontSize: 12.5, color: 'var(--text-secondary)',
}
const rowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px',
  background: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)', borderRadius: 10,
}
const emptyStyle: React.CSSProperties = {
  textAlign: 'center', padding: '60px 0', fontSize: 13, color: 'var(--text-muted)',
}
const noticeStyle: React.CSSProperties = {
  padding: '9px 12px', borderRadius: 8, marginBottom: 12, cursor: 'pointer',
  background: 'var(--accent-amber-soft)', color: 'var(--accent-amber)',
  border: '0.5px solid rgba(233,184,74,0.3)', fontSize: 12.5,
}
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 3000,
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  padding: '40px 16px', overflowY: 'auto',
}
const modalStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '0.5px solid var(--border-strong)',
  borderRadius: 14, padding: 20, width: '100%', maxWidth: 620,
}
const gridStyle: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 12,
}
const sectionNote: React.CSSProperties = {
  fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5,
  margin: '18px 0 12px', paddingTop: 14, borderTop: '0.5px solid var(--border-subtle)',
}

export { btnPrimary, btnGhost, btnGhostWide, rowStyle, emptyStyle, noticeStyle, overlayStyle, modalStyle, gridStyle }
