import { useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { fetchQuizzes } from '../api'
import QuizCard from './QuizCard'

export default function UpcomingRow() {
  const scrollerRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['quizzes-upcoming'],
    queryFn: () => fetchQuizzes({ page: 1 }),
    staleTime: 60 * 1000,
  })

  const upcoming = (data?.data ?? []).slice(0, 10)

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollerRef.current
    if (!el) return
    const delta = dir === 'left' ? -420 : 420
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }

  if (isLoading) {
    return (
      <div style={{ marginBottom: 24 }}>
        <div className="h-scroll">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{
              background: 'var(--bg-surface)',
              borderRadius: 10,
              aspectRatio: '1/1.6',
              opacity: 0.4,
            }} />
          ))}
        </div>
      </div>
    )
  }

  if (upcoming.length === 0) return null

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Section header with arrows */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
      }}>
        <h2 className="sg" style={{
          fontSize: 15,
          fontWeight: 500,
          letterSpacing: '-0.01em',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          margin: 0,
        }}>
          <Sparkles size={14} strokeWidth={1.8} style={{ color: 'var(--accent-amber)' }} />
          Uskoro
        </h2>
        <div style={{ display: 'flex', gap: 5 }}>
          <ArrowBtn onClick={() => scroll('left')} aria-label="Scroll levo">
            <ChevronLeft size={14} />
          </ArrowBtn>
          <ArrowBtn onClick={() => scroll('right')} aria-label="Scroll desno">
            <ChevronRight size={14} />
          </ArrowBtn>
        </div>
      </div>

      <div ref={scrollerRef} className="h-scroll">
        {upcoming.map(quiz => (
          <QuizCard key={quiz.id} quiz={quiz} compact />
        ))}
      </div>
    </div>
  )
}

function ArrowBtn({ children, onClick, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      {...rest}
      style={{
        width: 28,
        height: 28,
        borderRadius: 6,
        border: '0.5px solid var(--border-default)',
        background: 'rgba(255,255,255,0.03)',
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}
