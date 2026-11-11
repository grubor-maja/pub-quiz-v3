import { Heart } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState, type MouseEvent } from 'react'
import { addFavorite, removeFavorite } from '../api'
import { useAuth } from '../context/AuthContext'
import type { InfiniteData } from '@tanstack/react-query'
import type { PaginatedResponse, Quiz } from '../types'

type QuizList = PaginatedResponse<Quiz> | InfiniteData<PaginatedResponse<Quiz>>

interface HeartButtonProps {
  quizSlug: string
  isFavorited: boolean
  size?: number
  onToggled?: (nowFavorited: boolean) => void
  style?: React.CSSProperties
}

export default function HeartButton({
  quizSlug,
  isFavorited,
  size = 20,
  onToggled,
  style,
}: HeartButtonProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [popping, setPopping] = useState(false)

  const mutation = useMutation({
    mutationFn: async (nowFav: boolean) => {
      if (nowFav) {
        await addFavorite(quizSlug)
      } else {
        await removeFavorite(quizSlug)
      }
      return nowFav
    },
    onMutate: async (nowFav: boolean) => {
      // Cancel outgoing quiz queries
      await queryClient.cancelQueries({ queryKey: ['quizzes'] })
      await queryClient.cancelQueries({ queryKey: ['quiz', quizSlug] })
      await queryClient.cancelQueries({ queryKey: ['favorites'] })

      const prevQuizzesData = queryClient.getQueriesData<QuizList>({ queryKey: ['quizzes'] })
      const prevQuiz = queryClient.getQueryData<Quiz>(['quiz', quizSlug])
      const prevFavorites = queryClient.getQueryData<Quiz[]>(['favorites'])

      // Optimistically update the lists: a single page, or the pages "Učitaj još" loaded.
      const mark = (page: PaginatedResponse<Quiz>) => ({
        ...page,
        data: page.data.map((q) => (q.slug === quizSlug ? { ...q, is_favorited: nowFav } : q)),
      })
      queryClient.setQueriesData<QuizList>({ queryKey: ['quizzes'] }, (old) => {
        if (!old) return old
        if ('pages' in old) return { ...old, pages: old.pages.map(mark) }
        return mark(old)
      })

      // Optimistically update single quiz
      if (prevQuiz) {
        queryClient.setQueryData<Quiz>(['quiz', quizSlug], { ...prevQuiz, is_favorited: nowFav })
      }

      // Optimistically update favorites list
      if (prevFavorites) {
        if (nowFav) {
          // Don't add here - we don't have full quiz data at all card sites; just invalidate on success.
        } else {
          queryClient.setQueryData<Quiz[]>(['favorites'], prevFavorites.filter((q) => q.slug !== quizSlug))
        }
      }

      return { prevQuizzesData, prevQuiz, prevFavorites }
    },
    onError: (_err, _vars, ctx) => {
      if (!ctx) return
      ctx.prevQuizzesData.forEach(([key, data]) => {
        queryClient.setQueryData(key, data)
      })
      if (ctx.prevQuiz) {
        queryClient.setQueryData(['quiz', quizSlug], ctx.prevQuiz)
      }
      if (ctx.prevFavorites) {
        queryClient.setQueryData(['favorites'], ctx.prevFavorites)
      }
    },
    onSuccess: (nowFav) => {
      onToggled?.(nowFav)
      // Refresh favorites so newly added items show up
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
    },
  })

  const handleClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      navigate('/login')
      return
    }

    setPopping(true)
    setTimeout(() => setPopping(false), 220)
    mutation.mutate(!isFavorited)
  }

  const btnSize = Math.max(size + 20, 40)

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isFavorited}
      aria-label={isFavorited ? 'Ukloni iz omiljenih' : 'Sačuvaj u omiljene'}
      title={isFavorited ? 'Ukloni iz omiljenih' : 'Sačuvaj u omiljene'}
      style={{
        width: btnSize,
        height: btnSize,
        borderRadius: 12,
        border: '1px solid var(--border-default)',
        background: 'rgba(7,8,24,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: isFavorited ? 'var(--lime)' : 'var(--text-tertiary)',
        transform: popping ? 'scale(1.25)' : 'scale(1)',
        padding: 0,
        flex: 'none',
        ...style,
      }}
    >
      <Heart
        size={size}
        strokeWidth={2}
        fill={isFavorited ? 'var(--lime)' : 'none'}
        aria-hidden="true"
      />
    </button>
  )
}
