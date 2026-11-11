import type { CSSProperties } from 'react'

/** Shared look for the admin screens, on the redesign's tokens. */

export const btnPrimary: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 42, padding: '0 16px',
  borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
}
export const btnGhost: CSSProperties = {
  background: 'none', border: 'none', color: 'var(--text-muted)',
  cursor: 'pointer', padding: 8, display: 'inline-flex', alignItems: 'center', borderRadius: 10,
}
export const btnGhostWide: CSSProperties = {
  ...btnGhost, minHeight: 42, padding: '0 14px', gap: 6, border: '1px solid var(--border-strong)',
  borderRadius: 12, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'inherit',
}
export const rowStyle: CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
  background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 14,
}
export const emptyStyle: CSSProperties = {
  textAlign: 'center', padding: '60px 0', fontSize: 15, color: 'var(--text-muted)',
}
export const noticeStyle: CSSProperties = {
  padding: '10px 14px', borderRadius: 12, marginBottom: 12, cursor: 'pointer',
  background: 'var(--lime-soft)', color: 'var(--lime-light)',
  border: '1px solid rgba(182,242,62,0.3)', fontSize: 14,
}
export const overlayStyle: CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(3,4,14,0.7)', zIndex: 3000,
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  padding: '40px 16px', overflowY: 'auto',
}
export const modalStyle: CSSProperties = {
  background: '#0F112E', border: '1px solid var(--border-strong)',
  borderRadius: 20, padding: 24, width: '100%', maxWidth: 680,
}
export const gridStyle: CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14,
}
