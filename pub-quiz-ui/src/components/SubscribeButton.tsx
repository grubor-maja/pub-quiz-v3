import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Check, Plus } from 'lucide-react'
import { subscribeOrg, unsubscribeOrg } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/toast'
import { OrgBadge } from './OrgBadge'
import type { Organization } from '../types'

interface Props {
  slug: string
  isSubscribed: boolean
  /** Shown in the confirmation toast and used to draw its badge. */
  org?: Pick<Organization, 'name' | 'logo_url' | 'dragon_color' | 'dragon_prop' | 'dragon_shirt'>
  size?: 'sm' | 'md'
  /** Fill color when not yet following; defaults to the lime accent. */
  color?: string
}

export default function SubscribeButton({ slug, isSubscribed, org, size = 'md', color }: Props) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['organization', slug] })
    qc.invalidateQueries({ queryKey: ['subscriptions'] })
    qc.invalidateQueries({ queryKey: ['organizations'] })
  }

  const mutation = useMutation({
    mutationFn: (follow: boolean) => (follow ? subscribeOrg(slug) : unsubscribeOrg(slug)),
    onMutate: async (follow: boolean) => {
      await qc.cancelQueries({ queryKey: ['organization', slug] })
      const prev = qc.getQueryData<{ organization: Organization }>(['organization', slug])
      if (prev?.organization) {
        qc.setQueryData(['organization', slug], { ...prev, organization: { ...prev.organization, is_subscribed: follow } })
      }
      qc.setQueryData<Organization[]>(['organizations'], old =>
        old?.map(o => (o.slug === slug ? { ...o, is_subscribed: follow } : o)))
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['organization', slug], ctx.prev)
      refresh()
      toast({ message: 'Nije uspelo. Pokušaj ponovo.' })
    },
    onSuccess: (_d, follow) => {
      if (!org) return
      toast({
        icon: <OrgBadge org={org} size={34} />,
        message: follow ? <>Pratiš <b>{org.name}</b></> : <>Više ne pratiš <b>{org.name}</b></>,
        action: { label: 'Poništi', onClick: () => mutation.mutate(!follow) },
      })
    },
    onSettled: refresh,
  })

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      navigate('/login')
      return
    }
    mutation.mutate(!isSubscribed)
  }

  const fill = color ?? 'var(--lime)'

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={mutation.isPending}
      aria-pressed={isSubscribed}
      className={`btn${size === 'sm' ? ' btn-sm' : ''}`}
      style={isSubscribed
        ? { background: 'transparent', color: 'var(--text-primary)', borderColor: 'var(--border-strong)' }
        : { background: fill, color: 'var(--on-lime)', borderColor: fill }}
    >
      {isSubscribed ? <Check size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
      {isSubscribed ? 'Pratiš' : 'Prati'}
    </button>
  )
}
