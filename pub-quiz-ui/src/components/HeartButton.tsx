import { Heart } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useState, type MouseEvent } from 'react'
import { addFavorite, removeFavorite } from '../api'
import { useAuth } from '../context/AuthContext'
import type { PaginatedResponse, Quiz } from '../types'

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

      const prevQuizzesData = queryClient.getQueriesData<PaginatedResponse<Quiz>>({ queryKey: ['quizzes'] })
      const prevQuiz = queryClient.getQueryData<Quiz>(['quiz', quizSlug])
      const prevFavorites = queryClient.getQueryData<Quiz[]>(['favorites'])

      // Optimistically update paginated lists
      queryClient.setQueriesData<PaginatedResponse<Quiz>>({ queryKey: ['quizzes'] }, (old) => {
        if (!old) return old
        return {
          ...old,
          data: old.data.map((q) => (q.slug === quizSlug ? { ...q, is_favorited: nowFav } : q)),
        }
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

  const btnSize = size + 16

  return (
    <button
      onClick={handleClick}
      aria-label={isFavorited ? 'Ukloni iz favorita' : 'Dodaj u favorite'}
      title={isFavorited ? 'Ukloni iz favorita' : 'Dodaj u favorite'}
      style={{
        width: btnSize,
        height: btnSize,
        borderRadius: '50%',
        border: '0.5px solid var(--border-strong)',
        background: 'rgba(11,11,16,0.75)',
        backdropFilter: 'blur(8px)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: isFavorited ? 'var(--accent-amber)' : 'rgba(237,234,227,0.85)',
        transition: 'transform 180ms ease, color 180ms ease, background 180ms ease',
        transform: popping ? 'scale(1.25)' : 'scale(1)',
        padding: 0,
        ...style,
      }}
    >
      <Heart
        size={size}
        strokeWidth={1.8}
        fill={isFavorited ? 'var(--accent-amber)' : 'none'}
      />
    </button>
  )
}
