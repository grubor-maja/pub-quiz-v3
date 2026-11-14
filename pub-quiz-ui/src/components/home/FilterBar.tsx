import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpDown, Check, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import { OrgBadge } from '../OrgBadge'
import {
  KADA_LABELS, RADII, SORT_LABELS, kadaLabel,
  type FilterState, type Kada,
} from '../../lib/useQuizFilters'
import { useGeo } from '../../lib/useGeo'
import { kvizWord } from '../../lib/utils'
import type { Organization, QuizSort } from '../../types'

interface Props {
  state: FilterState
  update: (patch: Partial<FilterState>) => void
  clear: () => void
  orgs: Organization[] | undefined
  total: number | undefined
}

type Panel = 'kada' | 'udaljenost' | 'sort' | null

const KADA_KEYS = Object.keys(KADA_LABELS).filter(k => k !== 'datumi') as Exclude<Kada, '' | 'datumi'>[]
const SORT_KEYS = Object.keys(SORT_LABELS) as QuizSort[]

/** Filters on the home page: dropdowns on a computer, a sheet from the bottom on a phone. */
export default function FilterBar({ state, update, clear, orgs, total }: Props) {
  const geo = useGeo()
  const [open, setOpen] = useState<Panel>(null)
  const [sheet, setSheet] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
  const archive = state.tab === 'arhiva'

  // Near-me filters need a position; ask for it the moment one is chosen,
  // including when the page opens from a shared link that has one.
  const { status: geoStatus, request: requestGeo } = geo
  useEffect(() => {
    if ((state.udaljenost || state.sort === 'blizu') && geoStatus === 'idle') requestGeo()
  }, [state.udaljenost, state.sort, geoStatus, requestGeo])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null) }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc) }
  }, [open])

  // The sheet-open class hides the bottom tab bar, which would otherwise sit
  // over the sheet's buttons.
  useEffect(() => {
    document.body.style.overflow = sheet ? 'hidden' : ''
    document.body.classList.toggle('sheet-open', sheet)
    return () => { document.body.style.overflow = ''; document.body.classList.remove('sheet-open') }
  }, [sheet])

  const pick = (patch: Partial<FilterState>) => { update(patch); setOpen(null) }
  const toggleOrg = (slug: string) =>
    update({ org: state.org.includes(slug) ? state.org.filter(s => s !== slug) : [...state.org, slug] })

  const active: { label: string; clear: () => void }[] = []
  if (state.kada && !archive) active.push({ label: `Kada: ${kadaLabel(state)}`, clear: () => update({ kada: '', od: '', do: '' }) })
  if (state.udaljenost) active.push({ label: `Udaljenost: do ${state.udaljenost} km`, clear: () => update({ udaljenost: null }) })
  if (state.tab !== 'pratim') {
    for (const slug of state.org) {
      const o = orgs?.find(x => x.slug === slug)
      active.push({ label: o?.name ?? slug, clear: () => toggleOrg(slug) })
    }
  }
  const sheetCount = active.length

  const radiusLabel = state.udaljenost ? `do ${state.udaljenost} km` : 'Bilo gde'

  const kadaOptions = (
    <>
      <Option on={!state.kada} onClick={() => pick({ kada: '', od: '', do: '' })}>Bilo kad</Option>
      {KADA_KEYS.map(k => (
        <Option key={k} on={state.kada === k} onClick={() => pick({ kada: k, od: '', do: '' })}>{KADA_LABELS[k]}</Option>
      ))}
      <div style={{ padding: '10px 12px 4px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-muted)' }}>IZABERI DATUME</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <label className="field" style={{ minHeight: 42, flex: 1, padding: '0 10px' }}>
            <span className="sr-only">Od</span>
            <input type="date" value={state.od} onChange={e => update({ kada: 'datumi', od: e.target.value })} style={{ colorScheme: 'dark', fontSize: 14 }} />
          </label>
          <label className="field" style={{ minHeight: 42, flex: 1, padding: '0 10px' }}>
            <span className="sr-only">Do</span>
            <input type="date" value={state.do} onChange={e => update({ kada: 'datumi', do: e.target.value })} style={{ colorScheme: 'dark', fontSize: 14 }} />
          </label>
        </div>
      </div>
    </>
  )

  const radiusOptions = (
    <>
      <Option on={!state.udaljenost} onClick={() => pick({ udaljenost: null })}>Bilo gde</Option>
      {RADII.map(r => (
        <Option key={r} on={state.udaljenost === r} onClick={() => { geo.request(); pick({ udaljenost: r }) }}>do {r} km</Option>
      ))}
      <Note>{geo.message ?? 'Traži dozvolu za tvoju lokaciju, kao na mapi.'}</Note>
    </>
  )

  const sortOptions = (
    <>
      {SORT_KEYS.map(k => (
        <Option key={k} on={state.sort === k} onClick={() => { if (k === 'blizu') geo.request(); pick({ sort: k }) }}>{SORT_LABELS[k]}</Option>
      ))}
      {state.sort === 'blizu' && geo.message && <Note>{geo.message}</Note>}
    </>
  )

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Computer */}
      <div ref={barRef} className="only-desktop" style={{ position: 'relative', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {!archive && (
          <Dropdown label="Kada" value={kadaLabel(state)} on={!!state.kada} open={open === 'kada'} onToggle={() => setOpen(open === 'kada' ? null : 'kada')}>
            {kadaOptions}
          </Dropdown>
        )}
        <Dropdown label="Udaljenost" value={radiusLabel} on={!!state.udaljenost} open={open === 'udaljenost'} onToggle={() => setOpen(open === 'udaljenost' ? null : 'udaljenost')}>
          {radiusOptions}
        </Dropdown>
        <span style={{ flex: 1 }} />
        <Dropdown label={<ArrowUpDown size={16} aria-label="Sortiraj" />} value={SORT_LABELS[state.sort]} on={state.sort !== 'datum'} open={open === 'sort'} onToggle={() => setOpen(open === 'sort' ? null : 'sort')} alignRight>
          {sortOptions}
        </Dropdown>
      </div>

      {/* Phone */}
      <div className="only-mobile" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="chip" onClick={() => setSheet(true)}>
          <ArrowUpDown size={16} aria-hidden="true" />{SORT_LABELS[state.sort]}
        </button>
        <button type="button" className={`chip${sheetCount ? ' on' : ''}`} onClick={() => setSheet(true)}>
          <SlidersHorizontal size={16} aria-hidden="true" />Filteri
          {sheetCount > 0 && (
            <span style={{ minWidth: 20, height: 20, borderRadius: 999, background: 'var(--lime)', color: 'var(--on-lime)', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{sheetCount}</span>
          )}
        </button>
      </div>

      {active.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginTop: 12 }}>
          {active.map(a => (
            <button key={a.label} type="button" onClick={a.clear} aria-label={`Ukloni filter ${a.label}`} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 34, padding: '0 12px', borderRadius: 999, border: 0,
              background: 'rgba(182,242,62,0.14)', color: '#E9FFC2', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {a.label} <X size={14} aria-hidden="true" />
            </button>
          ))}
          <button type="button" onClick={clear} className="btn-ghost" style={{ border: 0, background: 'none', color: 'var(--text-muted)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer', minHeight: 44, padding: '0 8px' }}>
            Očisti sve
          </button>
        </div>
      )}

      {/* Portalled to <body>: inside the page, an ancestor's stacking context
          kept the sheet under the bottom tab bar whatever its z-index. */}
      {sheet && createPortal(
        <>
          <div className="sheet-backdrop" aria-hidden="true" onClick={() => setSheet(false)} />
          <section className="sheet" role="dialog" aria-modal="true" aria-label="Filteri i sortiranje">
            <span aria-hidden="true" style={{ display: 'block', width: 40, height: 4, borderRadius: 4, background: 'var(--border-strong)', margin: '0 auto 12px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h2 className="display" style={{ fontSize: 22, fontWeight: 700 }}>Filteri</h2>
              <button type="button" className="icon-btn" aria-label="Zatvori" onClick={() => setSheet(false)}><X size={18} /></button>
            </div>
            <SheetGroup title="Sortiraj">
              {SORT_KEYS.map(k => (
                <SheetChip key={k} on={state.sort === k} onClick={() => { if (k === 'blizu') geo.request(); update({ sort: k }) }}>{SORT_LABELS[k]}</SheetChip>
              ))}
            </SheetGroup>
            {!archive && (
              <SheetGroup title="Kada">
                <SheetChip on={!state.kada} onClick={() => update({ kada: '', od: '', do: '' })}>Bilo kad</SheetChip>
                {KADA_KEYS.map(k => (
                  <SheetChip key={k} on={state.kada === k} onClick={() => update({ kada: k, od: '', do: '' })}>{KADA_LABELS[k]}</SheetChip>
                ))}
              </SheetGroup>
            )}
            <SheetGroup title="Udaljenost">
              <SheetChip on={!state.udaljenost} onClick={() => update({ udaljenost: null })}>Bilo gde</SheetChip>
              {RADII.map(r => (
                <SheetChip key={r} on={state.udaljenost === r} onClick={() => { geo.request(); update({ udaljenost: r }) }}>do {r} km</SheetChip>
              ))}
              {geo.message && <Note>{geo.message}</Note>}
            </SheetGroup>
            {state.tab !== 'pratim' && orgs && orgs.length > 0 && (
              <SheetGroup title="Organizatori">
                {orgs.map(o => (
                  <button key={o.id} type="button" className={`chip with-badge${state.org.includes(o.slug) ? ' on' : ''}`} aria-pressed={state.org.includes(o.slug)} onClick={() => toggleOrg(o.slug)}>
                    <OrgBadge org={o} size={26} />{o.name}
                  </button>
                ))}
              </SheetGroup>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button type="button" className="btn btn-secondary" onClick={clear}>Očisti</button>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={() => setSheet(false)}>
                {total === undefined ? 'Prikaži' : `Prikaži ${total} ${kvizWord(total)}`}
              </button>
            </div>
          </section>
        </>,
        document.body,
      )}
    </div>
  )
}

function Dropdown({ label, value, on, open, onToggle, alignRight, children }: {
  label: ReactNode; value: string; on: boolean; open: boolean; onToggle: () => void; alignRight?: boolean; children: ReactNode
}) {
  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="chip"
        style={on || open ? { borderColor: 'var(--lime)', background: 'rgba(182,242,62,0.1)', color: 'var(--text-primary)', fontWeight: 600 } : { color: 'var(--text-primary)', fontWeight: 600 }}
      >
        {typeof label === 'string' ? <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{label}:</span> : label}
        {value}
        <ChevronDown size={14} aria-hidden="true" style={{ opacity: 0.7 }} />
      </button>
      {open && (
        <div className="popover" role="menu" style={alignRight ? { right: 0 } : { left: 0 }}>
          {children}
        </div>
      )}
    </div>
  )
}

function Option({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={on} className={`menu-item${on ? ' on' : ''}`} onClick={onClick}>
      <span>{children}</span>
      {on && <Check size={16} style={{ color: 'var(--lime)' }} aria-hidden="true" />}
    </button>
  )
}

function Note({ children }: { children: ReactNode }) {
  return <span style={{ display: 'block', width: '100%', padding: '8px 12px 0', fontSize: 12, color: 'var(--text-muted)' }}>{children}</span>
}

function SheetGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ display: 'block', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>{title}</span>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{children}</div>
    </div>
  )
}

function SheetChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className="chip" style={on ? { background: 'var(--lime)', color: 'var(--on-lime)', borderColor: 'var(--lime)', fontWeight: 600 } : undefined}>
      {children}
    </button>
  )
}
