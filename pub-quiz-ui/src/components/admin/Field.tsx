import type { ReactNode } from 'react'

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-muted)',
  marginBottom: 5,
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.025)',
  border: '0.5px solid var(--border-default)',
  borderRadius: 8,
  padding: '9px 11px',
  fontSize: 13,
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
        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 4 }}>
          {hint}
        </span>
      )}
      {error && (
        <span style={{ display: 'block', fontSize: 10.5, color: '#f87171', marginTop: 4 }}>
          {error}
        </span>
      )}
    </label>
  )
}

export { labelStyle }
