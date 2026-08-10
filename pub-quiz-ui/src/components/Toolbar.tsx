import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import CustomDatePicker from './CustomDatePicker'

interface Props {
  searchInput: string
  onSearchChange: (v: string) => void
  initialDateFrom: string
  initialDateTo: string
  onApplyFilters: (dateFrom: string, dateTo: string) => void
}

const inputBox: React.CSSProperties = {
  background: 'rgba(255,255,255,0.025)',
  border: '0.5px solid var(--border-default)',
  borderRadius: 8,
  padding: '9px 12px',
  fontSize: 13,
  color: 'var(--text-secondary)',
  display: 'flex',
  alignItems: 'center',
  gap: 9,
}

export default function Toolbar({
  searchInput, onSearchChange,
  initialDateFrom, initialDateTo,
  onApplyFilters,
}: Props) {
  const [dateFrom, setDateFrom] = useState(initialDateFrom)
  const [dateTo, setDateTo] = useState(initialDateTo)

  useEffect(() => { setDateFrom(initialDateFrom) }, [initialDateFrom])
  useEffect(() => { setDateTo(initialDateTo) }, [initialDateTo])

  const hasChanges =
    dateFrom !== initialDateFrom ||
    dateTo !== initialDateTo

  return (
    <div className="toolbar-grid">

      {/* Search */}
      <div style={inputBox}>
        <Search size={13} style={{ opacity: 0.5, flexShrink: 0 }} />
        <input
          type="text"
          value={searchInput}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Pretrazi kvizove po nazivu ili lokaciji…"
          style={{
            background: 'none',
            border: 'none',
            outline: 'none',
            width: '100%',
            fontSize: 13,
            color: 'var(--text-primary)',
          }}
        />
      </div>

      {/* Date OD */}
      <CustomDatePicker
        label="OD"
        value={dateFrom}
        onChange={setDateFrom}
        max={dateTo || undefined}
      />

      {/* Date DO */}
      <CustomDatePicker
        label="DO"
        value={dateTo}
        onChange={setDateTo}
        min={dateFrom || undefined}
      />

      {/* Primeni */}
      <button
        onClick={() => onApplyFilters(dateFrom, dateTo)}
        disabled={!hasChanges}
        className="btn-primeni"
        style={{
          padding: '9px 14px',
          borderRadius: 8,
          border: 'none',
          fontSize: 13,
          fontWeight: 500,
          cursor: hasChanges ? 'pointer' : 'default',
          background: hasChanges ? 'var(--accent-amber)' : 'rgba(255,255,255,0.04)',
          color: hasChanges ? '#0B0B10' : 'var(--text-muted)',
          whiteSpace: 'nowrap',
        }}
      >
        Primeni
      </button>
    </div>
  )
}
