import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import type { Organization } from '../types'
import { OrgBadge } from './OrgBadge'

interface Props {
  orgs: Organization[]
  selected: string[]
  onChange: (slugs: string[]) => void
}

/**
 * Organizer filter as a dropdown with search and a scrolling checklist, so it
 * stays one row tall however many organizers there are. Chips stopped fitting
 * once the list grew past a handful.
 */
export default function OrgMultiSelect({ orgs, selected, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    searchRef.current?.focus()
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase()
    return s ? orgs.filter(o => o.name.toLowerCase().includes(s)) : orgs
  }, [orgs, q])

  const toggle = (slug: string) => onChange(selected.includes(slug) ? selected.filter(s => s !== slug) : [...selected, slug])
  const picked = orgs.filter(o => selected.includes(o.slug))

  const label = picked.length === 0 ? 'Svi organizatori'
    : picked.length === 1 ? picked[0].name
    : `${picked.length} organizatora`

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        <button type="button" className={`chip${picked.length ? ' on' : ''}`} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(o => !o)}
          style={{ flex: 1, minWidth: 0, justifyContent: 'space-between' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          <ChevronDown size={16} aria-hidden="true" style={{ flex: 'none', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : undefined }} />
        </button>
        {picked.length > 0 && (
          <button type="button" className="chip" aria-label="Poništi izbor organizatora" onClick={() => onChange([])}><X size={14} aria-hidden="true" /></button>
        )}
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 1000, padding: 8, borderRadius: 16,
          background: '#141739', border: '1px solid var(--border-strong)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        }}>
          <label className="field" style={{ minHeight: 40, marginBottom: 6 }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} aria-hidden="true" />
            <span className="sr-only">Pretraži organizatore</span>
            <input ref={searchRef} type="search" placeholder="Pretraži…" value={q} onChange={e => setQ(e.target.value)} />
          </label>
          <ul role="listbox" aria-multiselectable="true" aria-label="Organizatori" style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: 280, overflowY: 'auto' }}>
            {shown.map(o => {
              const on = selected.includes(o.slug)
              return (
                <li key={o.id} role="option" aria-selected={on}>
                  <button type="button" onClick={() => toggle(o.slug)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '6px 8px', borderRadius: 10, border: 0, cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 14, textAlign: 'left', color: 'var(--text-primary)', background: on ? 'rgba(182,242,62,0.1)' : 'transparent',
                  }}>
                    <OrgBadge org={o} size={26} />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.name}</span>
                    <span aria-hidden="true" style={{
                      width: 18, height: 18, flex: 'none', borderRadius: 5, display: 'grid', placeItems: 'center',
                      border: `1.5px solid ${on ? 'var(--lime)' : 'var(--border-strong)'}`, background: on ? 'var(--lime)' : 'transparent', color: 'var(--on-lime)',
                    }}>{on && <Check size={13} strokeWidth={3} />}</span>
                  </button>
                </li>
              )
            })}
            {shown.length === 0 && <li style={{ padding: 10, fontSize: 13, color: 'var(--text-muted)' }}>Nema takvog organizatora.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
