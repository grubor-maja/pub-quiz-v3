import type { ReactNode } from 'react'

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--text-tertiary)',
  marginBottom: 6,
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  background: '#070818',
  border: '1px solid var(--border-default)',
  borderRadius: 12,
  padding: '10px 12px',
  fontSize: 15,
  color: 'var(--text-primary)',
  fontFamily: 'inherit',
  outline: 'none',
}

interface Props {
  label: string
  children: ReactNode
  hint?: string
  /** Rendered under the field when the server rejected this value. */
  error?: string
}

export default function Field({ label, children, hint, error }: Props) {
  return (
    <label style={{ display: 'block' }}>
      <span style={labelStyle}>{label}</span>
      {children}
      {hint && !error && (
        <span style={{ display: 'block', fontSize: 12.5, color: 'var(--text-muted)', marginTop: 5 }}>
          {hint}
        </span>
      )}
      {error && (
        <span style={{ display: 'block', fontSize: 12.5, color: '#FFB3C1', marginTop: 5 }}>
          {error}
        </span>
      )}
    </label>
  )
}

export { labelStyle }
