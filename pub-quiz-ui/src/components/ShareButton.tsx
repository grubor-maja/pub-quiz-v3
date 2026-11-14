import type { CSSProperties } from 'react'
import { Send } from 'lucide-react'
import type { Quiz } from '../types'
import { shareQuiz } from '../lib/share'
import { useToast } from '../context/toast'

interface Props {
  quiz: Quiz
  /** 'full' always shows the label; 'compact' only on desktop, an icon on the phone. */
  variant?: 'full' | 'compact'
  className?: string
  style?: CSSProperties
}

/** "Prosledi": sends the quiz to the team's group chat through the phone's share sheet. */
export default function ShareButton({ quiz, variant = 'compact', className = 'btn btn-secondary', style }: Props) {
  const toast = useToast()

  const onClick = async (e: React.MouseEvent) => {
    // Also used inside links and tap areas (stories); the click is ours alone.
    e.preventDefault()
    e.stopPropagation()
    const result = await shareQuiz(quiz)
    if (result === 'copied') toast({ message: 'Poruka je kopirana. Nalepi je ekipi u grupu.' })
    if (result === 'failed') toast({ message: 'Deljenje nije uspelo na ovom uređaju.' })
  }

  return (
    <button type="button" onClick={onClick} onPointerDown={(e) => e.stopPropagation()} className={className} style={style} aria-label="Prosledi ekipi">
      <Send size={18} aria-hidden="true" />
      {variant === 'full' ? 'Prosledi' : <span className="only-desktop">Prosledi</span>}
    </button>
  )
}
