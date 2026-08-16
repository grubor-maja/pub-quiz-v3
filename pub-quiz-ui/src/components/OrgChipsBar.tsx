import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Organization } from '../types'

interface Props {
  orgs?: Organization[]
  selected: string[]
  onToggle: (slug: string) => void
  onClearAll: () => void
}

export default function OrgChipsBar({ orgs, selected, onToggle, onClearAll }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  if (!orgs || orgs.length === 0) return null

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' })
  }

  const anySelected = selected.length > 0

  return (
    <div style={{ marginBottom: 22, position: 'relative' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <div style={{
          fontSize: 10,
          fontWeight: 500,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-muted)',
        }}>
          Organizacije
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {anySelected && (
            <button
              onClick={onClearAll}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: 11,
                cursor: 'pointer',
                padding: '4px 6px',
              }}
            >
              Očisti
            </button>
          )}
          <ArrowBtn onClick={() => scroll('left')} aria-label="Scroll levo">
            <ChevronLeft size={13} />
          </ArrowBtn>
          <ArrowBtn onClick={() => scroll('right')} aria-label="Scroll desno">
            <ChevronRight size={13} />
          </ArrowBtn>
        </div>
      </div>

      <div ref={scrollerRef} className="chips-scroll">
        {/* All chip (implicit) */}
        <Chip
          selected={!anySelected}
          onClick={onClearAll}
          label="Sve"
          logo={null}
        />
        {orgs.map(o => (
          <Chip
            key={o.slug}
            selected={selected.includes(o.slug)}
            onClick={() => onToggle(o.slug)}
            label={o.name}
            logo={o.logo_url}
          />
        ))}
      </div>
    </div>
  )
}

function Chip({
  selected, onClick, label, logo,
}: {
  selected: boolean
  onClick: () => void
  label: string
  logo: string | null
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const size = 54
  const showImg = logo && !imgFailed
  return (
    <button
      onClick={onClick}
      className="org-chip"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '2px 4px',
        opacity: selected ? 1 : 0.55,
        color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
      }}
    >
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: selected
          ? '2px solid var(--accent-amber)'
          : '1px solid var(--border-default)',
        background: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: selected ? '0 0 14px rgba(233,184,74,0.25)' : 'none',
      }}>
        {showImg ? (
          <img
            src={logo!}
            alt={label}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <span style={{
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--accent-amber)',
            fontFamily: "'Space Grotesk', sans-serif",
          }}>
            {label.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <span style={{
        fontSize: 10.5,
        maxWidth: 76,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        textAlign: 'center',
      }}>
        {label}
      </span>
    </button>
  )
}

function ArrowBtn({ children, onClick, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      {...rest}
      style={{
        width: 26,
        height: 26,
        borderRadius: 6,
        border: '0.5px solid var(--border-default)',
        background: 'rgba(255,255,255,0.03)',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
