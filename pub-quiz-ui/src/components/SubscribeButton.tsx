import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Bell, BellOff } from 'lucide-react'
import { subscribeOrg, unsubscribeOrg } from '../api'
import { useAuth } from '../context/AuthContext'

interface Props {
  slug: string
  isSubscribed: boolean
}

export default function SubscribeButton({ slug, isSubscribed }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: () => isSubscribed ? unsubscribeOrg(slug) : subscribeOrg(slug),
    onMutate: async () => {
      // optimistic update
      await qc.cancelQueries({ queryKey: ['organization', slug] })
      const prev = qc.getQueryData<any>(['organization', slug])
      if (prev?.organization) {
        qc.setQueryData(['organization', slug], {
          ...prev,
          organization: { ...prev.organization, is_subscribed: !isSubscribed },
        })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['organization', slug], ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['organization', slug] })
      qc.invalidateQueries({ queryKey: ['subscriptions'] })
      qc.invalidateQueries({ queryKey: ['organizations'] })
    },
  })

  const handleClick = () => {
    if (!user) {
      navigate('/login')
      return
    }
    mutation.mutate()
  }

  return (
    <button
      onClick={handleClick}
      disabled={mutation.isPending}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 14px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        cursor: mutation.isPending ? 'default' : 'pointer',
        border: isSubscribed ? '0.5px solid var(--border-strong)' : 'none',
        background: isSubscribed ? 'rgba(255,255,255,0.04)' : 'var(--accent-amber)',
        color: isSubscribed ? 'var(--text-primary)' : '#0B0B10',
        opacity: mutation.isPending ? 0.6 : 1,
        whiteSpace: 'nowrap',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {isSubscribed ? <BellOff size={13} /> : <Bell size={13} />}
      {isSubscribed ? 'Pratite' : 'Zaprati'}
    </button>
  )
}
