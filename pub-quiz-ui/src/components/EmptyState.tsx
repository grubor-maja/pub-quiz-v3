import type { ReactNode } from 'react'
import Zmaj from './Zmaj'

interface Props {
  title: string
  text?: ReactNode
  action?: ReactNode
}

/** The dragon with a magnifying glass, for lists that came back empty. */
export default function EmptyState({ title, text, action }: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap',
      padding: '36px 24px', borderRadius: 22, border: '1px dashed var(--border-default)', textAlign: 'left',
    }}>
      <Zmaj rekvizit="lupa" size={120} />
      <div style={{ maxWidth: 380 }}>
        <p className="display" style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>{title}</p>
        {text && <p style={{ fontSize: 15, color: 'var(--text-tertiary)', marginBottom: action ? 14 : 0 }}>{text}</p>}
        {action}
      </div>
    </div>
  )
}
