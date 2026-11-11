import type { CSSProperties } from 'react'

export const authCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

export const authFieldStyle: CSSProperties = {
  width: '100%',
  minHeight: 50,
  padding: '0 14px',
  background: 'rgba(7,8,24,0.7)',
  border: '1px solid var(--border-default)',
  borderRadius: 12,
  color: 'var(--text-primary)',
  fontSize: 16,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
}

export const authLabelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: 14,
  color: 'var(--text-secondary)',
  fontWeight: 600,
}

export const authSubmitStyle: CSSProperties = {
  minHeight: 52,
  borderRadius: 14,
  border: 0,
  fontSize: 16,
  fontWeight: 700,
  fontFamily: 'inherit',
  cursor: 'pointer',
  marginTop: 4,
}

export const authErrorStyle: CSSProperties = {
  color: '#FFB3C1',
  fontSize: 14,
  padding: '10px 12px',
  background: 'var(--danger-soft)',
  border: '1px solid rgba(255,92,122,0.4)',
  borderRadius: 12,
  lineHeight: 1.45,
}

export const authSuccessStyle: CSSProperties = {
  color: 'var(--lime-light)',
  fontSize: 14,
  padding: '10px 12px',
  background: 'var(--lime-soft)',
  border: '1px solid rgba(182,242,62,0.35)',
  borderRadius: 12,
  lineHeight: 1.45,
}
