import type { CSSProperties } from 'react'

export const authCardStyle: CSSProperties = {
  background: 'var(--bg-surface)',
  border: '0.5px solid var(--border-subtle)',
  borderRadius: 12,
  padding: 28,
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
}

export const authFieldStyle: CSSProperties = {
  width: '100%',
  padding: '11px 12px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid var(--border-default)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  fontSize: 13,
  fontFamily: "'Space Grotesk', system-ui, sans-serif",
  outline: 'none',
  boxSizing: 'border-box',
}

export const authLabelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 11,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  fontWeight: 500,
}

export const authSubmitStyle: CSSProperties = {
  height: 45,
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  marginTop: 4,
}

export const authErrorStyle: CSSProperties = {
  color: '#ef4444',
  fontSize: 12,
  padding: '8px 10px',
  background: 'rgba(239,68,68,0.08)',
  border: '0.5px solid rgba(239,68,68,0.3)',
  borderRadius: 6,
  lineHeight: 1.45,
}

export const authSuccessStyle: CSSProperties = {
  color: '#10b981',
  fontSize: 12,
  padding: '8px 10px',
  background: 'rgba(16,185,129,0.08)',
  border: '0.5px solid rgba(16,185,129,0.3)',
  borderRadius: 6,
  lineHeight: 1.45,
}
