import DragonLogo from './DragonLogo'

export default function LoadingScreen() {
  return (
    <div
      style={{ minHeight: '65vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}
    >
      <DragonLogo size={100} walking />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="loading-dot" style={{ animationDelay: `${i * 0.18}s` }} />
        ))}
      </div>
    </div>
  )
}
