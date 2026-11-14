import { useId, useRef } from 'react'
import { useDragonEyes } from '../lib/useDragonEyes'
import { PALETTES, SHIRTS, type DragonColor, type DragonProp, type DragonShirt } from '../lib/dragon'

interface Props {
  boja?: DragonColor
  rekvizit?: DragonProp
  majica?: DragonShirt
  /** Organization logo for the shirt. Without one the shirt carries a "?". */
  logo?: string | null
  /** Width in px. A whole dragon is 215/200 as tall; a head is square. */
  size?: number
  /** 'ceo' draws the whole dragon, 'glava' a head cropped into a circle. */
  oblik?: 'ceo' | 'glava'
  animated?: boolean
  /** Eyes follow the mouse and blink at random. Meant for the big dragons on the home and login pages. */
  gleda?: boolean
  /**
   * A passing mood, for the login form: 'skriva' covers its eyes (password),
   * 'ljut' frowns and fumes (wrong password), 'srecan' hops and waves (success).
   */
  raspolozenje?: 'skriva' | 'ljut' | 'srecan'
  title?: string
  className?: string
}

/**
 * The site's mascot as one SVG. The same figure, recolored, is every
 * organization's dragon. Animation is CSS (see .zmaj-anim in index.css), so it
 * stops for visitors who ask their system for less motion.
 */
export default function Zmaj({
  boja = 'lime',
  rekvizit = 'knjiga',
  majica = 'teget',
  logo = null,
  size = 200,
  oblik = 'ceo',
  animated = true,
  gleda = false,
  raspolozenje,
  title,
  className = '',
}: Props) {
  const clipId = useId().replace(/:/g, '')
  const svgRef = useRef<SVGSVGElement>(null)
  const looks = gleda && animated
  useDragonEyes(svgRef, looks)
  const p = PALETTES[boja]
  const [c1, c2, c3, c4, c5] = p.body
  const [h1, h2] = p.horn
  const shirt = SHIRTS[majica]
  const lightShirt = majica === 'bela' || majica === 'lime'
  const head = oblik === 'glava'
  const height = head ? size : Math.round((size * 215) / 200)
  const angry = rekvizit === 'ljutko'
  const frown = angry || raspolozenje === 'ljut'

  return (
    <svg
      ref={svgRef}
      viewBox={head ? '36 6 128 128' : '0 0 200 215'}
      width={size}
      height={height}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`${animated ? 'zmaj-anim ' : ''}${looks ? 'zmaj-gleda ' : ''}${raspolozenje ? `zmaj-${raspolozenje} ` : ''}${className}`}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <clipPath id={clipId}><circle cx="100" cy="156" r="14" /></clipPath>
      </defs>

      {!head && <ellipse cx="100" cy="207" rx="50" ry="6" fill="#000" opacity="0.35" />}

      {rekvizit === 'sijalica' && (
        <g className="z-bulb">
          <circle cx="156" cy="26" r="16" fill="#FFD43B" opacity="0.25" />
          <circle cx="156" cy="24" r="10" fill="#FFD43B" />
          <rect x="151" y="32" width="10" height="7" rx="2" fill="#B5B5AE" />
          <path d="M142 10 L146 14 M170 10 L166 14 M156 4 L156 8" stroke="#FFD43B" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}

      <g className="z-bob">
        <g className="z-tail">
          <path d="M126 170 C158 176 176 160 174 136 L182 146 C186 178 160 196 122 190 Z" fill={c4} />
          <polygon points="174,136 192,126 182,146" fill={h1} />
        </g>
        <g className="z-wl">
          <polygon points="70,112 22,80 34,114 14,122 40,130 24,142 66,140" fill={c4} />
          <polygon points="70,112 34,114 40,130 66,140" fill={c5} />
        </g>
        <g className="z-wr">
          <polygon points="130,112 178,80 166,114 186,122 160,130 176,142 134,140" fill={c5} />
          <polygon points="130,112 166,114 160,130 134,140" fill={c4} />
        </g>
        <path d="M68 178 L94 178 L94 203 Q80 207 64 203 Z" fill={c4} />
        <path d="M106 178 L132 178 L136 203 Q120 207 106 203 Z" fill={c5} />

        <path d="M60 128 Q100 108 140 128 L150 146 L138 152 L140 182 Q100 196 60 182 L62 152 L50 146 Z" fill={shirt} />
        <path d="M100 114 Q122 116 140 128 L150 146 L138 152 L140 182 Q120 190 100 192 Z" fill="#000" opacity="0.16" />
        <path d="M86 121 Q100 133 114 121" stroke={lightShirt ? '#CFCFC6' : 'rgba(255,255,255,0.18)'} strokeWidth="4" fill="none" strokeLinecap="round" />
        {logo ? (
          <g>
            <circle cx="100" cy="156" r="17" fill="#fff" />
            <image href={logo} x="86" y="142" width="28" height="28" clipPath={`url(#${clipId})`} preserveAspectRatio="xMidYMid slice" />
          </g>
        ) : (
          <text x="100" y="168" textAnchor="middle" fontFamily="Space Grotesk, Arial, sans-serif" fontWeight="700" fontSize="32" fill={lightShirt ? '#1B1640' : '#B6F23E'}>?</text>
        )}

        {rekvizit === 'knjiga' && (
          <g transform="rotate(-12 60 158)">
            <rect x="48" y="142" width="24" height="32" rx="3" fill="#FF9F43" />
            <rect x="48" y="142" width="6" height="32" rx="2" fill="#E0782A" />
          </g>
        )}
        {rekvizit === 'lopta' && (
          <g>
            <circle cx="58" cy="166" r="13" fill="#fff" />
            <polygon points="58,160 63,164 61,170 55,170 53,164" fill="#111" />
            <path d="M58 153 L58 160 M70 163 L63 164 M66 177 L61 170 M50 177 L55 170 M46 163 L53 164" stroke="#111" strokeWidth="1.6" />
          </g>
        )}
        {rekvizit === 'lupa' && (
          <g>
            <path d="M60 172 L48 188" stroke="#7A5230" strokeWidth="6" strokeLinecap="round" />
            <circle cx="66" cy="162" r="12" fill="#BFE9FF" fillOpacity="0.35" stroke="#2A2D5C" strokeWidth="4" />
          </g>
        )}
        {rekvizit === 'mikrofon' && (
          <g>
            <path d="M58 170 L52 190" stroke="#2A2D5C" strokeWidth="6" strokeLinecap="round" />
            <circle cx="60" cy="160" r="10" fill="#C9CCEA" />
            <path d="M53 156 L67 156 M52 161 L68 161 M53 166 L67 166" stroke="#8A8FB5" strokeWidth="1.5" />
          </g>
        )}

        <ellipse cx="70" cy="152" rx="9" ry="13" fill={c2} transform="rotate(25 70 152)" />
        <g className="z-wave">
          <path d="M136 134 Q156 124 158 100" stroke={c3} strokeWidth="15" fill="none" strokeLinecap="round" />
          <circle cx="158" cy="97" r="10" fill={c2} />
        </g>

        <g className="z-head">
          <polygon points="70,52 58,18 90,44" fill={h1} />
          <polygon points="70,52 58,18 76,47" fill={h2} />
          <polygon points="130,52 142,18 110,44" fill={h2} />
          <polygon points="130,52 142,18 124,47" fill={h1} />
          <polygon points="52,70 38,62 50,86" fill={h1} />
          <polygon points="148,70 162,62 150,86" fill={h2} />
          <path d="M100 30 C140 30 152 60 150 84 C148 112 128 124 100 124 C72 124 52 112 50 84 C48 60 60 30 100 30 Z" fill={c2} />
          <path d="M100 30 C140 30 152 60 150 84 C148 112 128 124 100 124 Z" fill={c3} />
          <ellipse cx="82" cy="46" rx="16" ry="6" fill={c1} opacity="0.85" />
          <ellipse cx="100" cy="103" rx="31" ry="17" fill={c1} />
          <ellipse cx="91" cy="98" rx="2.6" ry="2" fill={c5} />
          <ellipse cx="109" cy="98" rx="2.6" ry="2" fill={c5} />
          <path d={frown ? 'M90 112 Q100 108 110 112' : 'M88 109 Q100 118 112 109'} stroke={c5} strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="64" cy="100" rx="6" ry="3.5" fill={h1} opacity="0.55" />
          <ellipse cx="136" cy="100" rx="6" ry="3.5" fill={h1} opacity="0.55" />
          {angry && (
            <g>
              <path d="M58 52 C60 22 140 22 142 52 Z" fill="#111" />
              <path d="M136 46 C150 44 164 48 168 54 C156 56 146 54 138 52 Z" fill="#111" />
              <rect x="88" y="34" width="24" height="9" rx="2" fill="#fff" />
            </g>
          )}
          <g className="z-turn">
          <path d="M58 76 L48 72 M142 76 L152 72" stroke="#0A0B1E" strokeWidth="4.5" strokeLinecap="round" />
          <rect x="58" y="65" width="36" height="27" rx="10" fill="#fff" fillOpacity="0.15" stroke="#0A0B1E" strokeWidth="5" />
          <rect x="106" y="65" width="36" height="27" rx="10" fill="#fff" fillOpacity="0.15" stroke="#0A0B1E" strokeWidth="5" />
          <path d="M94 76 Q100 71 106 76" stroke="#0A0B1E" strokeWidth="5" fill="none" />
          {frown && <path d="M60 58 L90 64 M140 58 L110 64" stroke="#0A0B1E" strokeWidth="5" strokeLinecap="round" />}
          <g className="z-look"><g className="z-blink"><circle cx="77" cy="79" r="7" fill="#0A0B1E" /><circle cx="79.6" cy="76.4" r="2.4" fill="#fff" /></g></g>
          <g className="z-look"><g className="z-blink"><circle cx="123" cy="79" r="7" fill="#0A0B1E" /><circle cx="125.6" cy="76.4" r="2.4" fill="#fff" /></g></g>
          {/* Happy eyes, shown instead of the pupils while srecan. */}
          <path className="z-happy" d="M68 82 Q77 71 86 82 M114 82 Q123 71 132 82" stroke="#0A0B1E" strokeWidth="4.5" fill="none" strokeLinecap="round" />
          </g>
          {raspolozenje === 'ljut' && (
            <g className="z-smoke" fill="#C9CCEA">
              <circle cx="90" cy="96" r="3.5" />
              <circle cx="110" cy="96" r="3.5" />
            </g>
          )}
          {/* Paws over the eyes for raspolozenje="skriva", like the see-no-evil
              monkey; out of sight otherwise. */}
          <g className="z-cover">
            <path d="M64 138 Q46 116 66 96" stroke={c3} strokeWidth="14" fill="none" strokeLinecap="round" />
            <path d="M136 138 Q154 116 134 96" stroke={c4} strokeWidth="14" fill="none" strokeLinecap="round" />
            {[76, 124].map((x) => (
              <g key={x}>
                <circle cx={x - 13} cy={67} r={6.5} fill={c2} stroke={c4} strokeWidth="2" />
                <circle cx={x} cy={62} r={7} fill={c2} stroke={c4} strokeWidth="2" />
                <circle cx={x + 13} cy={67} r={6.5} fill={c2} stroke={c4} strokeWidth="2" />
                <ellipse cx={x} cy={83} rx={20} ry={17} fill={c2} stroke={c4} strokeWidth="2" />
                <ellipse cx={x} cy={88} rx={10} ry={7} fill={c1} opacity="0.7" />
              </g>
            ))}
          </g>
        </g>
      </g>
    </svg>
  )
}
