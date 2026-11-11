import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Download, FlaskConical, Pencil, Plus, Shuffle, Trash2 } from 'lucide-react'
import {
  adminCreateOrganization,
  adminDeleteOrganization,
  adminFetchOrganizations,
  adminPreviewOrganization,
  adminTestSync,
  adminUpdateOrganization,
  type TestSyncResult,
} from '../../api'
import type { AdminOrganization } from '../../types'
import Field, { inputStyle } from '../../components/admin/Field'
import { OrgBadge, OrgDragon } from '../../components/OrgBadge'
import PinFlag from '../../components/PinFlag'
import {
  COLOR_LABELS, DRAGON_COLORS, DRAGON_PROPS, DRAGON_SHIRTS, PALETTES, PROP_LABELS, SHIRTS, SHIRT_LABELS,
  accentOf, dragonOf, tint, type DragonColor,
} from '../../lib/dragon'
import { useSeo } from '../../lib/useSeo'

type Draft = Partial<AdminOrganization>

const EMPTY: Draft = {
  name: '', slug: '', instagram_handle: '', logo_url: '', description: '',
  default_location: '', default_address: '', default_quiz_time: '',
  default_entry_fee: null, default_contact_phone: '',
  default_min_team_members: null, default_max_team_members: null,
  dragon_prop: 'knjiga', dragon_shirt: 'teget',
}

/** Empty strings would be stored as "" where the extraction expects null. */
function clean(draft: Draft): Draft {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(draft)) {
    if (['id', 'created_at', 'updated_at', 'quizzes_count', 'published_quizzes_count', 'is_subscribed'].includes(k)) continue
    out[k] = v === '' ? null : v
  }
  return out as Draft
}

/** The first color no organization uses, so a new dragon stands apart from the others. */
function freeColor(orgs: AdminOrganization[] | undefined): DragonColor {
  const used = new Set(orgs?.map(o => o.dragon_color))
  return DRAGON_COLORS.find(c => !used.has(c)) ?? DRAGON_COLORS[(orgs?.length ?? 0) % DRAGON_COLORS.length]
}

export default function AdminOrganizationsPage() {
  const qc = useQueryClient()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [test, setTest] = useState<TestSyncResult | null>(null)
  const [formMsg, setFormMsg] = useState<string | null>(null)

  useSeo({ title: 'Administracija organizacija', description: 'Interna stranica.', path: '/admin/organizacije' })

  const { data: orgs, isLoading } = useQuery({ queryKey: ['admin-organizations'], queryFn: adminFetchOrganizations })

  const close = () => { setDraft(null); setTest(null); setFormMsg(null); setErrors({}) }

  const done = (msg: string) => {
    qc.invalidateQueries({ queryKey: ['admin-organizations'] })
    qc.invalidateQueries({ queryKey: ['organizations'] })
    close()
    setNotice(msg)
  }

  const onError = (e: any) => {
    const data = e?.response?.data
    if (data?.errors) {
      setErrors(Object.fromEntries(Object.entries(data.errors).map(([k, v]: any) => [k, v[0]])))
      setFormMsg('Neka polja nisu ispravna, pogledaj poruke ispod njih.')
    } else {
      const msg = data?.message ?? 'Greška pri čuvanju.'
      setFormMsg(msg)
      setNotice(msg)
    }
  }

  const save = useMutation({
    mutationFn: (d: Draft) => (d.id ? adminUpdateOrganization(d.id, clean(d)) : adminCreateOrganization(clean(d))),
    onSuccess: (_r, d) => done(d.id ? 'Organizacija sačuvana.' : 'Organizacija dodata.'),
    onError,
  })

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteOrganization(id),
    onSuccess: () => done('Organizacija obrisana.'),
    onError,
  })

  // Fills the form from the account rather than writing anything, because the
  // default_* values it guesses apply to every quiz scraped afterwards.
  const preview = useMutation({
    mutationFn: (handle: string) => adminPreviewOrganization(handle),
    onSuccess: (r) => {
      setDraft(d => ({ ...(d ?? {}), ...r.draft }))
      setFormMsg(r.warnings.length ? r.warnings.join(' ') : 'Predlog učitan. Proveri vrednosti pre čuvanja.')
    },
    onError,
  })

  const runTest = useMutation({
    mutationFn: (d: Draft) => adminTestSync({
      instagram_handle: d.instagram_handle,
      slug: d.slug || undefined,
      default_location: d.default_location || undefined,
      default_address: d.default_address || undefined,
      default_quiz_time: d.default_quiz_time ? String(d.default_quiz_time).slice(0, 5) : undefined,
      default_entry_fee: d.default_entry_fee ?? undefined,
      default_contact_phone: d.default_contact_phone || undefined,
      default_min_team_members: d.default_min_team_members ?? undefined,
      default_max_team_members: d.default_max_team_members ?? undefined,
    }),
    onSuccess: (r) => { setTest(r); setFormMsg(null) },
    onError,
  })

  const set = (k: keyof AdminOrganization, v: unknown) => setDraft(d => ({ ...(d ?? {}), [k]: v }))

  if (draft) {
    return (
      <Editor
        draft={draft} set={set} errors={errors} formMsg={formMsg} test={test}
        onBack={close}
        onLoad={() => draft.instagram_handle && preview.mutate(draft.instagram_handle)} loading={preview.isPending}
        onTest={() => { setTest(null); runTest.mutate(draft) }} testing={runTest.isPending}
        onSave={() => save.mutate(draft)} saving={save.isPending}
      />
    )
  }

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="section-heading" style={{ marginTop: 12 }}>
        <h1 className="display" style={{ fontSize: 30, fontWeight: 700 }}>Organizacije</h1>
        <button type="button" className="btn btn-primary" onClick={() => { setDraft({ ...EMPTY, dragon_color: freeColor(orgs) }); setErrors({}); setNotice(null) }}>
          <Plus size={16} aria-hidden="true" /> Dodaj organizaciju
        </button>
      </div>

      {notice && (
        <div role="status" style={{ padding: '10px 14px', borderRadius: 12, marginBottom: 14, background: 'var(--lime-soft)', color: 'var(--lime-light)', border: '1px solid rgba(182,242,62,0.3)', fontSize: 14 }}>
          {notice}
        </div>
      )}

      {isLoading ? (
        <p style={{ color: 'var(--text-muted)', padding: '40px 0' }}>Učitavanje…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orgs?.map(o => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16 }}>
              <span style={{ width: 56, height: 56, flex: 'none', borderRadius: 14, background: tint(accentOf(o), 0.14), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <OrgDragon org={o} size={52} animated={false} />
              </span>
              <OrgBadge org={o} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{o.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {o.slug}{o.instagram_handle ? ` · @${o.instagram_handle}` : ''} · {o.quizzes_count ?? 0} kvizova
                </div>
              </div>
              <button type="button" className="icon-btn" onClick={() => { setDraft({ ...o }); setErrors({}); setNotice(null) }} aria-label={`Izmeni ${o.name}`}><Pencil size={16} /></button>
              <button
                type="button"
                className="icon-btn"
                style={{ color: '#FFB3C1' }}
                aria-label={`Obriši ${o.name}`}
                onClick={() => { if (confirm(`Obrisati organizaciju "${o.name}"?`)) remove.mutate(o.id) }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Editor({ draft, set, errors, formMsg, test, onBack, onLoad, loading, onTest, testing, onSave, saving }: {
  draft: Draft
  set: (k: keyof AdminOrganization, v: unknown) => void
  errors: Record<string, string>
  formMsg: string | null
  test: TestSyncResult | null
  onBack: () => void
  onLoad: () => void; loading: boolean
  onTest: () => void; testing: boolean
  onSave: () => void; saving: boolean
}) {
  const d = dragonOf(draft)
  const accent = PALETTES[d.color].accent
  const name = draft.name || 'Nova organizacija'

  const surprise = () => {
    set('dragon_color', DRAGON_COLORS[Math.floor(Math.random() * DRAGON_COLORS.length)])
    set('dragon_prop', DRAGON_PROPS[Math.floor(Math.random() * (DRAGON_PROPS.length - 1))])
  }

  return (
    <div className="page">
      <button type="button" onClick={onBack} className="back-rail" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginLeft: -12, borderRadius: 10, color: 'var(--text-tertiary)', background: 'none', border: 0, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>
        <ArrowLeft size={16} aria-hidden="true" /> Organizacije
      </button>
      <h1 className="display" style={{ fontSize: 30, fontWeight: 700, margin: '6px 0 22px' }}>{draft.id ? `Izmena: ${draft.name}` : 'Nova organizacija'}</h1>

      {formMsg && (
        <div role="status" style={{ padding: '10px 14px', borderRadius: 12, marginBottom: 16, background: 'var(--lime-soft)', color: 'var(--lime-light)', border: '1px solid rgba(182,242,62,0.3)', fontSize: 14, lineHeight: 1.5 }}>
          {formMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ flex: '999 1 560px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <Panel title="Osnovno">
            <div style={grid}>
              <Field label="Naziv" error={errors.name}>
                <input style={inputStyle} value={draft.name ?? ''} onChange={e => set('name', e.target.value)} />
              </Field>
              <Field label="Slug" hint="Ostavi prazno da se izvede iz naziva" error={errors.slug}>
                <input style={inputStyle} value={draft.slug ?? ''} onChange={e => set('slug', e.target.value)} placeholder="npr. pab-kviz-8x8" />
              </Field>
              <Field label="Instagram handle" hint="Bez @. „Učitaj“ popunjava ostala polja i logo." error={errors.instagram_handle}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input style={inputStyle} value={draft.instagram_handle ?? ''} onChange={e => set('instagram_handle', e.target.value)} placeholder="pabkviz8x8" />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={onLoad} disabled={!draft.instagram_handle || loading}>
                    <Download size={15} aria-hidden="true" />{loading ? '…' : 'Učitaj'}
                  </button>
                </div>
              </Field>
              <Field label="Logo URL" hint="Logo ide automatski na majicu zmaja." error={errors.logo_url}>
                <input style={inputStyle} value={draft.logo_url ?? ''} onChange={e => set('logo_url', e.target.value)} placeholder="/images/logo-x.jpg" />
              </Field>
            </div>
            <Field label="Opis" error={errors.description}>
              <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={draft.description ?? ''} onChange={e => set('description', e.target.value)} />
            </Field>
          </Panel>

          <Panel title="Zmaj organizatora" accent action={
            <button type="button" className="btn btn-secondary btn-sm" onClick={surprise}><Shuffle size={15} aria-hidden="true" /> Iznenadi me</button>
          }>
            <Choice label="Boja zmaja">
              {DRAGON_COLORS.map(c => {
                const on = d.color === c
                return (
                  <button key={c} type="button" role="radio" aria-checked={on} aria-label={COLOR_LABELS[c]} title={COLOR_LABELS[c]} onClick={() => set('dragon_color', c)} style={{
                    width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', background: PALETTES[c].accent,
                    border: `3px solid ${on ? '#F1F2FF' : 'transparent'}`, boxShadow: on ? `0 0 0 3px ${PALETTES[c].accent}` : 'none',
                  }} />
                )
              })}
            </Choice>
            {errors.dragon_color && <p style={errText}>{errors.dragon_color}</p>}
            <Choice label="Rekvizit">
              {DRAGON_PROPS.map(p => (
                <button key={p} type="button" role="radio" aria-checked={d.prop === p} className={`chip${d.prop === p ? ' on' : ''}`} onClick={() => set('dragon_prop', p)}>{PROP_LABELS[p]}</button>
              ))}
            </Choice>
            <Choice label="Majica">
              {DRAGON_SHIRTS.map(s => (
                <button key={s} type="button" role="radio" aria-checked={d.shirt === s} className={`chip${d.shirt === s ? ' on' : ''}`} onClick={() => set('dragon_shirt', s)}>
                  <span aria-hidden="true" style={{ width: 18, height: 18, borderRadius: 6, background: SHIRTS[s], border: '1px solid rgba(255,255,255,0.3)' }} />{SHIRT_LABELS[s]}
                </button>
              ))}
            </Choice>
          </Panel>

          <details style={{ padding: '16px 20px', borderRadius: 20, background: '#0D0F2A', border: '1px solid var(--border-subtle)' }}>
            <summary style={{ cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>Podrazumevane vrednosti za scraping</summary>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '10px 0 14px', lineHeight: 1.5 }}>
              Koriste se samo kada objava ne navodi podatak. Ostavi prazno ako se menja od kviza do kviza.
            </p>
            <div style={grid}>
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
          </details>

          {test && (
            <div style={{ padding: 16, borderRadius: 16, fontSize: 13, lineHeight: 1.55, background: '#0D0F2A', border: '1px solid var(--border-subtle)', maxHeight: 300, overflowY: 'auto', color: 'var(--text-secondary)' }}>
              <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                Probni sync: {test.total_quizzes} kviz(ova) iz {test.posts.length} objava
              </div>
              {test.posts.map((p, i) => (
                <div key={i} style={{ marginBottom: 8 }}>
                  <div style={{ color: 'var(--text-muted)' }}>{p.posted_at} · {p.caption}</div>
                  {p.quizzes.length === 0
                    ? <div style={{ color: 'var(--text-muted)', paddingLeft: 10 }}>preskočeno</div>
                    : p.quizzes.map((q, j) => (
                      <div key={j} style={{ paddingLeft: 10, color: 'var(--lime)' }}>
                        {q.quiz_date ?? '?'} {q.quiz_time ?? ''} · {q.title ?? 'bez naziva'}{q.location ? ` · ${q.location}` : ''}
                      </div>
                    ))}
                </div>
              ))}
              <div style={{ color: 'var(--text-muted)', marginTop: 6 }}>Ništa nije sačuvano. Ovo je samo prikaz šta bi sync napravio.</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" style={{ marginRight: 'auto' }} onClick={onTest} disabled={!draft.instagram_handle || testing} title="Pokaži šta bi sync izvukao, bez upisa">
              <FlaskConical size={16} aria-hidden="true" />{testing ? 'Testiram…' : 'Probaj sync'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onBack}>Odustani</button>
            <button type="button" className="btn btn-primary" onClick={onSave} disabled={saving}>{saving ? 'Čuvanje…' : 'Sačuvaj'}</button>
          </div>
        </div>

        <aside style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 90 }}>
          <section style={{ padding: 20, borderRadius: 24, background: tint(accent, 0.08), border: `1px solid ${tint(accent, 0.3)}`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <span style={{ alignSelf: 'flex-start', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)' }}>PREGLED UŽIVO</span>
            <OrgDragon org={draft} size={240} />
            <span className="display" style={{ fontSize: 22, fontWeight: 700 }}>{name}</span>
          </section>
          <section style={{ padding: 18, borderRadius: 20, background: '#0D0F2A', border: '1px solid var(--border-subtle)' }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 14 }}>GDE SE POJAVLJUJE</span>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', gap: 12, flexWrap: 'wrap' }}>
              <Spot label="Chip i kartica">
                <span className="chip with-badge" style={{ cursor: 'default' }}><OrgBadge org={draft} size={26} />{name}</span>
              </Spot>
              <Spot label="Pin na mapi"><PinFlag org={draft} /></Spot>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14, marginBottom: 14 }
const errText: React.CSSProperties = { fontSize: 13, color: '#FFB3C1', marginTop: -8 }

function Panel({ title, accent, action, children }: { title: string; accent?: boolean; action?: ReactNode; children: ReactNode }) {
  return (
    <section style={{ padding: 22, borderRadius: 20, background: '#0D0F2A', border: `1px solid ${accent ? 'rgba(182,242,62,0.25)' : 'var(--border-subtle)'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function Choice({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 10 }}>{label}</p>
      <div role="radiogroup" aria-label={label} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

function Spot({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
      {children}{label}
    </span>
  )
}
