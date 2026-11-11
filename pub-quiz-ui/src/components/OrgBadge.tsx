import Zmaj from './Zmaj'
import { dragonOf, PALETTES, tint, type DragonLook } from '../lib/dragon'

interface OrgLike extends DragonLook {
  name?: string
}

/**
 * The organization's logo in a circle ringed in its dragon's color: the badge
 * on chips, cards and lists. Without a logo, the dragon's head stands in.
 */
export function OrgBadge({ org, size = 28 }: { org: OrgLike; size?: number }) {
  const d = dragonOf(org)
  const accent = PALETTES[d.color].accent
  const ring = size >= 40 ? 2 : 1.5

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: d.logo ? '#fff' : tint(accent, 0.28),
        boxShadow: `0 0 0 ${ring}px ${accent}`,
      }}
    >
      {d.logo ? (
        <img src={d.logo} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <Zmaj boja={d.color} rekvizit={d.prop} majica={d.shirt} oblik="glava" size={size} animated={false} />
      )}
    </span>
  )
}

/** The organization's whole dragon, logo on its shirt. */
export function OrgDragon({ org, size = 200, animated = true }: { org: OrgLike; size?: number; animated?: boolean }) {
  const d = dragonOf(org)
  return (
    <Zmaj
      boja={d.color}
      rekvizit={d.prop}
      majica={d.shirt}
      logo={d.logo}
      size={size}
      animated={animated}
      title={org.name ? `Zmaj organizatora ${org.name}` : undefined}
    />
  )
}
