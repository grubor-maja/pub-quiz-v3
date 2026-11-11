import Zmaj from './Zmaj'

export default function LoadingScreen() {
  return (
    <div
      role="status"
      aria-label="Učitavanje"
      style={{ minHeight: '55vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}
    >
      <Zmaj size={120} />
      <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Učitavanje…</span>
    </div>
  )
}

/** Card-shaped placeholder shown while a grid of quizzes loads. */
export function SkeletonCard() {
  return (
    <div aria-hidden="true" style={{ borderRadius: 18, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="skeleton" style={{ aspectRatio: '4 / 5' }} />
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div className="skeleton" style={{ height: 12, width: '50%', borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 18, width: '85%', borderRadius: 6 }} />
        <div className="skeleton" style={{ height: 12, width: '40%', borderRadius: 6 }} />
      </div>
    </div>
  )
}
