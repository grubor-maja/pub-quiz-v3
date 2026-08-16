import { useRef, useState, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  label: string
  value: string
  onChange: (v: string) => void
  min?: string
  max?: string
}

const MONTHS_SR = ['Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun', 'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar']
const DAYS_SR = ['Pon', 'Uto', 'Sre', 'Čet', 'Pet', 'Sub', 'Ned']

function formatBadge(iso: string) {
  if (!iso) return null
  const [, m, d] = iso.split('-')
  return `${d}.${m}`
}

function toIso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fromIso(iso: string): Date | null {
  if (!iso) return null
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export default function CustomDatePicker({ label, value, onChange, min, max }: Props) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => fromIso(value) ?? new Date())
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  useEffect(() => {
    const d = fromIso(value)
    if (d) setViewDate(d)
  }, [value])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  // ISO week starts Monday (day=1), Sunday=0
  const firstWeekday = (firstDay.getDay() + 6) % 7

  const minDate = min ? fromIso(min) : null
  const maxDate = max ? fromIso(max) : null
  const selectedDate = fromIso(value)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const cells: Array<{ day: number; date: Date } | null> = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: new Date(year, month, d) })

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

  const isDisabled = (d: Date) => {
    if (minDate && d < minDate) return true
    if (maxDate && d > maxDate) return true
    return false
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          background: 'rgba(255,255,255,0.025)',
          border: '0.5px solid var(--border-default)',
          borderRadius: 8,
          padding: '9px 12px',
          fontSize: 13,
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{
          fontSize: 10,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          flexShrink: 0,
        }}>
          {label}
        </span>
        <span style={{ flex: 1, fontSize: 13 }}>
          {formatBadge(value) ?? <span style={{ opacity: 0.35 }}>—</span>}
        </span>
        <Calendar size={11} style={{ opacity: 0.4, flexShrink: 0 }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--border-strong)',
            borderRadius: 10,
            padding: 12,
            width: 260,
            zIndex: 50,
            boxShadow: '0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
          }}>
            <NavBtn onClick={() => setViewDate(new Date(year, month - 1, 1))}>
              <ChevronLeft size={13} />
            </NavBtn>
            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
              {MONTHS_SR[month]} {year}
            </span>
            <NavBtn onClick={() => setViewDate(new Date(year, month + 1, 1))}>
              <ChevronRight size={13} />
            </NavBtn>
          </div>

          {/* Weekdays */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 2,
            marginBottom: 4,
          }}>
            {DAYS_SR.map(d => (
              <div key={d} style={{
                fontSize: 9.5,
                color: 'var(--text-muted)',
                textAlign: 'center',
                padding: '4px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 2,
          }}>
            {cells.map((c, i) => {
              if (!c) return <div key={i} />
              const disabled = isDisabled(c.date)
              const isSelected = selectedDate && isSameDay(c.date, selectedDate)
              const isToday = isSameDay(c.date, today)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => { onChange(toIso(c.date)); setOpen(false) }}
                  className="cdp-day"
                  style={{
                    aspectRatio: '1',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 11.5,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    background: isSelected
                      ? 'var(--accent-amber)'
                      : isToday
                        ? 'rgba(255,255,255,0.04)'
                        : 'transparent',
                    color: isSelected
                      ? '#0B0B10'
                      : disabled
                        ? 'var(--text-muted)'
                        : 'var(--text-secondary)',
                    fontWeight: isSelected ? 600 : isToday ? 500 : 400,
                    opacity: disabled ? 0.3 : 1,
                  }}
                >
                  {c.day}
                </button>
              )
            })}
          </div>

          {/* Footer actions */}
          <div style={{
            display: 'flex',
            gap: 6,
            marginTop: 10,
            paddingTop: 10,
            borderTop: '0.5px solid var(--border-subtle)',
          }}>
            <FooterBtn onClick={() => { onChange(toIso(new Date())); setOpen(false) }}>
              Danas
            </FooterBtn>
            {value && (
              <FooterBtn onClick={() => { onChange(''); setOpen(false) }}>
                Očisti
              </FooterBtn>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cdp-nav"
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        border: 'none',
        background: 'rgba(255,255,255,0.04)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  )
}

function FooterBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cdp-footer"
      style={{
        flex: 1,
        padding: '6px 8px',
        borderRadius: 6,
        border: '0.5px solid var(--border-default)',
        background: 'transparent',
        color: 'var(--text-secondary)',
        fontSize: 11,
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
