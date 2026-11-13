import { useMemo, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, ChevronRight, Search, ShieldCheck, UserCog, X } from 'lucide-react'
import { adminFetchOrganizations, adminFetchUsers, adminSetUserOrganizations } from '../../api'
import type { AdminUser } from '../../types'
import { inputStyle } from '../../components/admin/Field'
import { OrgBadge } from '../../components/OrgBadge'
import { useSeo } from '../../lib/useSeo'
import { errorMessage } from './adminStyles'
import { useAuth } from '../../context/AuthContext'
import { btnGhost, btnGhostWide, emptyStyle, noticeStyle, overlayStyle, modalStyle } from './adminStyles'

const ROLES = [
  { value: '', label: 'Svi korisnici' },
  { value: 'org_admin', label: 'Administratori organizacija' },
  { value: 'admin', label: 'Administratori sajta' },
]

const fmtDate = (s: string) => new Date(s).toLocaleDateString('sr-Latn-RS', { day: 'numeric', month: 'numeric', year: 'numeric' })

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const { user: me, refetch } = useAuth()
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useSeo({ title: 'Korisnici', description: 'Interna stranica.', path: '/admin/korisnici' })

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, role, page],
    queryFn: () => adminFetchUsers({ search, role, page }),
    placeholderData: keepPreviousData,
  })

  const save = useMutation({
    mutationFn: ({ user, ids }: { user: AdminUser; ids: string[] }) => adminSetUserOrganizations(user.id, ids),
    onSuccess: (_r, { user, ids }) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setEditing(null)
      setNotice(ids.length
        ? `${user.name} je sada administrator za ${ids.length} ${ids.length === 1 ? 'organizaciju' : 'organizacije'}.`
        : `${user.name} više nije administrator nijedne organizacije.`)
      if (user.id === me?.id) refetch()
    },
    onError: (e: unknown) => setNotice(errorMessage(e) ?? 'Greška pri čuvanju.'),
  })

  return (
    <div className="page" style={{ maxWidth: 1100 }}>
      <div className="section-heading" style={{ marginTop: 12 }}>
        <h1 className="display" style={{ fontSize: 30, fontWeight: 700 }}>Korisnici</h1>
        {data && <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>{data.total} ukupno</span>}
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.55, margin: '-4px 0 18px', maxWidth: 720 }}>
        Administrator organizacije posle prijave vidi „Moja organizacija“ i „Moji kvizovi“: može da menja podatke svoje
        organizacije i da dodaje, menja i briše njene kvizove. Ne može da obriše organizaciju niti da vidi tuđe.
      </p>

      {notice && <div role="status" style={noticeStyle} onClick={() => setNotice(null)}>{notice}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 380 }}>
          <Search size={16} aria-hidden="true" style={{ position: 'absolute', left: 12, top: 14, color: 'var(--text-muted)' }} />
          <input
            style={{ ...inputStyle, paddingLeft: 36 }}
            placeholder="Ime ili email"
            aria-label="Pretraži korisnike"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select style={{ ...inputStyle, maxWidth: 260 }} aria-label="Uloga" value={role} onChange={e => { setRole(e.target.value); setPage(1) }}>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div style={emptyStyle}>Učitavanje…</div>
      ) : data?.data.length === 0 ? (
        <div style={emptyStyle}>Nema korisnika za ovu pretragu.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data?.data.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 16, flexWrap: 'wrap' }}>
              <span className="display" aria-hidden="true" style={{
                width: 42, height: 42, flex: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 17,
                background: u.is_admin ? 'var(--lime)' : u.managed_organizations.length ? 'rgba(167,139,250,0.22)' : 'var(--bg-elevated)',
                color: u.is_admin ? 'var(--on-lime)' : 'var(--text-primary)',
              }}>
                {u.name.charAt(0).toUpperCase()}
              </span>
              <div style={{ flex: '1 1 220px', minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {u.name}
                  {u.is_admin && <RoleTag lime>ADMIN SAJTA</RoleTag>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {u.email} · od {fmtDate(u.created_at)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: '2 1 240px' }}>
                {u.managed_organizations.length === 0 ? (
                  !u.is_admin && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Korisnik</span>
                ) : u.managed_organizations.map(o => (
                  <span key={o.id} className="chip" style={{ cursor: 'default', minHeight: 30, fontSize: 13 }}>
                    <ShieldCheck size={13} aria-hidden="true" /> {o.name}
                  </span>
                ))}
              </div>
              {u.is_admin ? (
                <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 150, textAlign: 'right' }}>ima pristup svemu</span>
              ) : (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(u)} style={{ width: 150 }}>
                  <UserCog size={15} aria-hidden="true" /> Uloge
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {data && data.last_page > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 20 }}>
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1} style={btnGhostWide} aria-label="Prethodna strana"><ChevronLeft size={15} /></button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{page} / {data.last_page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page === data.last_page} style={btnGhostWide} aria-label="Sledeća strana"><ChevronRight size={15} /></button>
        </div>
      )}

      {editing && (
        <RolesDialog
          user={editing}
          saving={save.isPending}
          onClose={() => setEditing(null)}
          onSave={ids => save.mutate({ user: editing, ids })}
        />
      )}
    </div>
  )
}

function RoleTag({ children, lime }: { children: string; lime?: boolean }) {
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 999,
      background: lime ? 'var(--lime-soft)' : 'rgba(167,139,250,0.18)', color: lime ? 'var(--lime-light)' : '#C4B5FD',
    }}>{children}</span>
  )
}

function RolesDialog({ user, saving, onClose, onSave }: {
  user: AdminUser; saving: boolean; onClose: () => void; onSave: (ids: string[]) => void
}) {
  const { data: orgs } = useQuery({ queryKey: ['admin-organizations'], queryFn: adminFetchOrganizations })
  const [picked, setPicked] = useState<Set<string>>(() => new Set(user.managed_organizations.map(o => o.id)))
  const [q, setQ] = useState('')

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return (orgs ?? []).filter(o => !needle || o.name.toLowerCase().includes(needle))
  }, [orgs, q])

  const toggle = (id: string) => setPicked(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ ...modalStyle, maxWidth: 520 }} role="dialog" aria-modal="true" aria-labelledby="roles-title">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id="roles-title" style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Administrator organizacija</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0' }}>{user.name} · {user.email}</p>
          </div>
          <button type="button" onClick={onClose} style={btnGhost} aria-label="Zatvori"><X size={18} /></button>
        </div>

        <p style={{ fontSize: 13.5, color: 'var(--text-tertiary)', lineHeight: 1.5, margin: '12px 0 14px' }}>
          Označi organizacije kojima ovaj korisnik upravlja. Bez oznake ostaje običan korisnik.
        </p>

        <input style={{ ...inputStyle, marginBottom: 10 }} placeholder="Pretraži organizacije" aria-label="Pretraži organizacije" value={q} onChange={e => setQ(e.target.value)} />

        <div role="group" aria-label="Organizacije" style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4, padding: 2 }}>
          {shown.map(o => {
            const on = picked.has(o.id)
            return (
              <button
                key={o.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(o.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 12, cursor: 'pointer',
                  background: on ? 'rgba(182,242,62,0.08)' : 'transparent', fontFamily: 'inherit', color: 'var(--text-primary)',
                  border: `1px solid ${on ? 'rgba(182,242,62,0.35)' : 'transparent'}`, textAlign: 'left',
                }}
              >
                <OrgBadge org={o} size={30} />
                <span style={{ flex: 1, fontSize: 15 }}>{o.name}</span>
                <span aria-hidden="true" style={{
                  width: 22, height: 22, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: on ? 'var(--lime)' : 'transparent', border: on ? 'none' : '1.5px solid var(--border-strong)', color: 'var(--on-lime)',
                }}>
                  {on && <Check size={15} strokeWidth={3} />}
                </span>
              </button>
            )
          })}
          {orgs && shown.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: 14, padding: 10 }}>Nema takve organizacije.</p>}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 18, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', marginRight: 'auto' }}>Označeno: {picked.size}</span>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Odustani</button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => onSave([...picked])}>
            {saving ? 'Čuvanje…' : 'Sačuvaj'}
          </button>
        </div>
      </div>
    </div>
  )
}
