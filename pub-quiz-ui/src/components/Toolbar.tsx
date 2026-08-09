import { useEffect, useState } from 'react'
import { Search, Building2 } from 'lucide-react'
import type { Organization } from '../types'
import CustomSelect from './CustomSelect'
import CustomDatePicker from './CustomDatePicker'

interface Props {
  searchInput: string
  onSearchChange: (v: string) => void
  initialOrg: string
  initialDateFrom: string
  initialDateTo: string
  onApplyFilters: (org: string, dateFrom: string, dateTo: string) => void
  orgs?: Organization[]
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
  initialOrg, initialDateFrom, initialDateTo,
  onApplyFilters, orgs,
}: Props) {
  const [org, setOrg] = useState(initialOrg)
  const [dateFrom, setDateFrom] = useState(initialDateFrom)
  const [dateTo, setDateTo] = useState(initialDateTo)

  useEffect(() => { setOrg(initialOrg) }, [initialOrg])
  useEffect(() => { setDateFrom(initialDateFrom) }, [initialDateFrom])
  useEffect(() => { setDateTo(initialDateTo) }, [initialDateTo])

  const hasChanges =
    org !== initialOrg ||
    dateFrom !== initialDateFrom ||
    dateTo !== initialDateTo

  const orgOptions = (orgs ?? []).map(o => ({ value: o.slug, label: o.name }))

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 180px 130px 130px auto',
      gap: 8,
      marginBottom: 22,
    }}>

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

      {/* Org dropdown */}
      <CustomSelect
        value={org}
        onChange={setOrg}
        options={orgOptions}
        placeholder="Sve organizacije"
        icon={<Building2 size={13} style={{ opacity: 0.5, flexShrink: 0 }} />}
      />

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
        onClick={() => onApplyFilters(org, dateFrom, dateTo)}
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
          transition: 'background 0.15s, color 0.15s',
          whiteSpace: 'nowrap',
        }}
      >
        Primeni
      </button>
    </div>
  )
}
