import { useState, useEffect } from 'react'

interface Props {
  size?: number
  walking?: boolean
  className?: string
}

export default function DragonLogo({ size = 48, walking = true, className = '' }: Props) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (!walking) return
    const id = setInterval(() => setFrame(f => 1 - f), 380)
    return () => clearInterval(id)
  }, [walking])

  return (
    <div
      className={`dragon-bob relative ${className}`}
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      <img
        src="/images/logo1.png"
        alt="Ko zna zna"
        draggable={false}
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: frame === 0 ? 1 : 0,
          transition: 'opacity 0.05s',
        }}
      />
      <img
        src="/images/logo2.png"
        alt=""
        draggable={false}
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: frame === 1 ? 1 : 0,
          transition: 'opacity 0.05s',
        }}
      />
    </div>
  )
}
