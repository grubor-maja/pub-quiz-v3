/**
 * Every organization has a dragon: the site's mascot in its own color, holding
 * one prop, wearing a shirt with the organization's logo. The API stores the
 * three choices by name; the colors behind those names live only here.
 */

export const DRAGON_COLORS = ['lime', 'tirkiz', 'ljubicasta', 'koral', 'led', 'roze', 'zlatna', 'crvena'] as const
export const DRAGON_PROPS = ['knjiga', 'lopta', 'lupa', 'sijalica', 'ljutko', 'mikrofon', 'nista'] as const
export const DRAGON_SHIRTS = ['teget', 'crna', 'bela', 'plava', 'lime'] as const

export type DragonColor = typeof DRAGON_COLORS[number]
export type DragonProp = typeof DRAGON_PROPS[number]
export type DragonShirt = typeof DRAGON_SHIRTS[number]

export interface DragonLook {
  dragon_color?: string | null
  dragon_prop?: string | null
  dragon_shirt?: string | null
  logo_url?: string | null
}

interface Palette {
  /** Five shades, lightest to darkest, for the faceted body. */
  body: [string, string, string, string, string]
  /** Horns and spikes. */
  horn: [string, string]
  /** The shade used for rings, accents and tinted backgrounds. */
  accent: string
}

export const PALETTES: Record<DragonColor, Palette> = {
  lime:       { body: ['#D9FF8A', '#7BD23A', '#5DB535', '#3E9B2C', '#2B7A27'], horn: ['#FF9F43', '#E0782A'], accent: '#7BD23A' },
  tirkiz:     { body: ['#B8F7E6', '#3FD1B0', '#2BB394', '#1E8F76', '#157060'], horn: ['#FFD43B', '#F2B705'], accent: '#3FD1B0' },
  ljubicasta: { body: ['#E2D8FF', '#A78BFA', '#8B6FF0', '#6D4FD6', '#5636B8'], horn: ['#67E8F9', '#22B8D6'], accent: '#A78BFA' },
  koral:      { body: ['#FFD9C2', '#FF8A5B', '#F2703F', '#D9542A', '#B8411E'], horn: ['#FFD43B', '#F2B705'], accent: '#FF8A5B' },
  led:        { body: ['#D6F1FF', '#6CC8FF', '#4AAEEA', '#2E8BD0', '#1F6FAF'], horn: ['#FF5C7A', '#E03A5C'], accent: '#6CC8FF' },
  roze:       { body: ['#FFD6EC', '#FF7AC0', '#F25AA8', '#D63F8C', '#B32B70'], horn: ['#B6F23E', '#8FD12A'], accent: '#FF7AC0' },
  zlatna:     { body: ['#FFF1B8', '#FFC93C', '#F2B01E', '#D99512', '#B5780B'], horn: ['#FF6B5B', '#E04A3A'], accent: '#FFC93C' },
  crvena:     { body: ['#FFCFCF', '#FF5D5D', '#EB4343', '#C92F2F', '#A32020'], horn: ['#FFD43B', '#F2B705'], accent: '#FF5D5D' },
}

export const SHIRTS: Record<DragonShirt, string> = {
  teget: '#1B1640',
  crna: '#111111',
  bela: '#F4F4F0',
  plava: '#2340E0',
  lime: '#B6F23E',
}

export const COLOR_LABELS: Record<DragonColor, string> = {
  lime: 'Lime', tirkiz: 'Tirkiz', ljubicasta: 'Ljubičasta', koral: 'Koral',
  led: 'Ledena', roze: 'Roze', zlatna: 'Zlatna', crvena: 'Crvena',
}

export const PROP_LABELS: Record<DragonProp, string> = {
  knjiga: 'Knjiga', lopta: 'Lopta', lupa: 'Lupa', sijalica: 'Sijalica',
  ljutko: 'Ljutko (kačket)', mikrofon: 'Mikrofon', nista: 'Bez rekvizita',
}

export const SHIRT_LABELS: Record<DragonShirt, string> = {
  teget: 'Teget', crna: 'Crna', bela: 'Bela', plava: 'Plava', lime: 'Lime',
}

const isColor = (v: unknown): v is DragonColor => DRAGON_COLORS.includes(v as DragonColor)
const isProp = (v: unknown): v is DragonProp => DRAGON_PROPS.includes(v as DragonProp)
const isShirt = (v: unknown): v is DragonShirt => DRAGON_SHIRTS.includes(v as DragonShirt)

/** Reads an organization's dragon, falling back to the site's own lime one. */
export function dragonOf(o: DragonLook | null | undefined) {
  const color: DragonColor = isColor(o?.dragon_color) ? o!.dragon_color as DragonColor : 'lime'
  const prop: DragonProp = isProp(o?.dragon_prop) ? o!.dragon_prop as DragonProp : 'knjiga'
  const shirt: DragonShirt = isShirt(o?.dragon_shirt) ? o!.dragon_shirt as DragonShirt : 'teget'
  return { color, prop, shirt, logo: o?.logo_url ?? null }
}

export function accentOf(o: DragonLook | null | undefined): string {
  return PALETTES[dragonOf(o).color].accent
}

/** The accent at a given opacity, for tinted panels and soft rings. */
export function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`
}
