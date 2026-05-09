import { Link } from 'react-router-dom'
import { Trophy } from 'lucide-react'

export default function Navbar() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-zinc-100 font-semibold hover:text-white transition-colors">
          <Trophy size={18} className="text-indigo-400" />
          <span>Ko Zna Zna</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link to="/" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
            Kvizovi
          </Link>
          <Link to="/organizacije" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">
            Organizacije
          </Link>
        </nav>
      </div>
    </header>
  )
}
