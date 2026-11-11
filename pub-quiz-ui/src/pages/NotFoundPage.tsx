import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import { useSeo } from '../lib/useSeo'

export default function NotFoundPage() {
  useSeo({ title: 'Stranica nije pronađena', description: 'Ova stranica ne postoji.' })

  return (
    <div className="page" style={{ paddingTop: 72 }}>
      <EmptyState
        title="Ovu stranicu nismo našli"
        text="Možda je kviz obrisan ili je link pogrešan."
        action={<Link to="/" className="btn btn-primary">Nazad na kvizove</Link>}
      />
    </div>
  )
}
