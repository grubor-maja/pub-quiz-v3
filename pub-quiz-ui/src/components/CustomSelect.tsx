import { useRef, useState, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface Props {
  value: string
  onChange: (v: string) => void
  options: Option[]
  placeholder: string
  icon?: React.ReactNode
}

export default function CustomSelect({ value, onChange, options, placeholder, icon }: Props) {
  const [open, setOpen] = useState(false)
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

  const selected = options.find(o => o.value === value)

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
        {icon}
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={11}
          style={{
            opacity: 0.4,
            flexShrink: 0,
            transition: 'transform 0.15s',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--border-strong)',
            borderRadius: 8,
            padding: 4,
            maxHeight: 280,
            overflowY: 'auto',
            zIndex: 50,
            boxShadow: '0 12px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02)',
          }}
        >
          <Item
            label={placeholder}
            selected={value === ''}
            onClick={() => { onChange(''); setOpen(false) }}
          />
          {options.map(opt => (
            <Item
              key={opt.value}
              label={opt.label}
              selected={opt.value === value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Item({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="cs-item"
      style={{
        padding: '8px 10px',
        borderRadius: 6,
        fontSize: 13,
        color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
      }}
    >
      <span style={{ width: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {selected && <Check size={11} style={{ color: 'var(--accent-amber)' }} />}
      </span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </div>
  )
}
