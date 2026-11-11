import Zmaj from './Zmaj'
import { dragonOf, PALETTES, type DragonLook } from '../lib/dragon'

/** The organizer's dragon head with a flag carrying its logo: the map pin. */
export default function PinFlag({ org }: { org: DragonLook }) {
  const d = dragonOf(org)
  const accent = PALETTES[d.color].accent
  return (
    <div style={{ position: 'relative', width: 70, height: 52 }}>
      <div style={{ position: 'absolute', left: 0, top: 7, width: 45, height: 45, borderRadius: '50%', overflow: 'hidden', boxShadow: `0 0 0 2px ${accent}, 0 0 0 4px #070818` }}>
        <Zmaj boja={d.color} rekvizit={d.prop} majica={d.shirt} oblik="glava" size={45} animated={false} />
      </div>
      <svg viewBox="0 0 64 48" width="34" height="26" aria-hidden="true" style={{ position: 'absolute', left: 36, top: 0, overflow: 'visible' }}>
        <rect x="0" y="0" width="3.2" height="48" rx="1.6" fill="#C9CCEA" />
        <path d="M3 2 C20 -2 36 6 62 2 L54 15 L62 28 C36 32 20 24 3 28 Z" fill={d.logo ? '#fff' : accent} stroke={accent} strokeWidth="2.4" strokeLinejoin="round" />
        {d.logo && <image href={d.logo} x="9" y="3" width="40" height="24" preserveAspectRatio="xMidYMid meet" />}
      </svg>
    </div>
  )
}
