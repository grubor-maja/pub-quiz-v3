import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Calendar, Clock, MapPin, Users, Banknote, Phone, Instagram, ArrowLeft } from 'lucide-react'
import { fetchQuiz } from '../api'
import { formatDate, formatPrice, formatTime } from '../lib/utils'

export default function QuizDetailPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data: quiz, isLoading, isError } = useQuery({
    queryKey: ['quiz', slug],
    queryFn: () => fetchQuiz(slug!),
    enabled: !!slug,
  })

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-zinc-800 rounded w-2/3" />
          <div className="h-4 bg-zinc-800 rounded w-1/3" />
          <div className="h-48 bg-zinc-800 rounded-xl mt-6" />
        </div>
      </div>
    )
  }

  if (isError || !quiz) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-zinc-500">
        Kviz nije pronadjen.
        <Link to="/" className="block mt-4 text-indigo-400 hover:text-indigo-300">Nazad na listu</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-100 transition-colors mb-6">
        <ArrowLeft size={14} />
        Svi kvizovi
      </Link>

      {quiz.cover_image_url && (
        <img
          src={quiz.cover_image_url}
          alt={quiz.title}
          className="w-full h-56 object-cover rounded-xl mb-6"
        />
      )}

      <div className="flex items-start justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold text-zinc-100 leading-snug">{quiz.title}</h1>
        <Link
          to={`/organizacije/${quiz.organization.slug}`}
          className="shrink-0 text-xs bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-zinc-100 px-3 py-1 rounded-full transition-colors"
        >
          {quiz.organization.name}
        </Link>
      </div>

      {quiz.description && (
        <p className="text-zinc-400 text-sm mb-6 leading-relaxed">{quiz.description}</p>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
        {quiz.quiz_date && (
          <div className="flex items-center gap-3 text-sm">
            <Calendar size={16} className="text-zinc-500 shrink-0" />
            <span className="text-zinc-300">{formatDate(quiz.quiz_date)}</span>
          </div>
        )}

        {quiz.quiz_time && (
          <div className="flex items-center gap-3 text-sm">
            <Clock size={16} className="text-zinc-500 shrink-0" />
            <span className="text-zinc-300">{formatTime(quiz.quiz_time)}h</span>
          </div>
        )}

        {quiz.location && (
          <div className="flex items-start gap-3 text-sm">
            <MapPin size={16} className="text-zinc-500 shrink-0 mt-0.5" />
            <div>
              <span className="text-zinc-300">{quiz.location}</span>
              {quiz.address && <span className="text-zinc-500 block">{quiz.address}</span>}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 text-sm">
          <Banknote size={16} className="text-zinc-500 shrink-0" />
          <span className="text-zinc-300">{formatPrice(quiz.entry_fee)} po timu</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Users size={16} className="text-zinc-500 shrink-0" />
          <span className="text-zinc-300">{quiz.min_team_members}-{quiz.max_team_members} clanova po timu</span>
        </div>

        {quiz.contact_phone && (
          <div className="flex items-center gap-3 text-sm">
            <Phone size={16} className="text-zinc-500 shrink-0" />
            <a
              href={`tel:${quiz.contact_phone}`}
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {quiz.contact_phone}
            </a>
          </div>
        )}

        {quiz.instagram_post_url && (
          <div className="flex items-center gap-3 text-sm">
            <Instagram size={16} className="text-zinc-500 shrink-0" />
            <a
              href={quiz.instagram_post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Instagram post
            </a>
          </div>
        )}
      </div>

      {quiz.contact_phone && (
        <a
          href={`tel:${quiz.contact_phone}`}
          className="mt-6 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl text-sm font-medium transition-colors"
        >
          <Phone size={15} />
          Prijavi se: {quiz.contact_phone}
        </a>
      )}
    </div>
  )
}
