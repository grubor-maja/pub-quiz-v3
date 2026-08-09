interface Props {
  title: string
  subtitle?: string
}

export default function PageHeader({ title, subtitle }: Props) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h1 className="sg" style={{
        fontSize: 22,
        fontWeight: 500,
        letterSpacing: '-0.02em',
        margin: 0,
        color: 'var(--text-primary)',
      }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 3 }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}
