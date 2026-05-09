import { Calendar, Clock, MapPin, Users, Banknote } from 'lucide-react'
import { Link } from 'react-router-dom'
import { formatDate, formatPrice, formatTime } from '../lib/utils'
import type { Quiz } from '../types'

interface Props {
  quiz: Quiz
}

export default function QuizCard({ quiz }: Props) {
  return (
    <Link
      to={`/kvizovi/${quiz.slug}`}
      className="block bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 hover:bg-zinc-800/60 transition-all"
    >
      {quiz.cover_image_url && (
        <img
          src={quiz.cover_image_url}
          alt={quiz.title}
          className="w-full h-40 object-cover rounded-lg mb-4"
        />
      )}

      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="text-base font-medium text-zinc-100 leading-snug">{quiz.title}</h3>
        <span className="shrink-0 text-xs bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full">
          {quiz.organization.name}
        </span>
      </div>

      <div className="space-y-1.5">
        {quiz.quiz_date && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Calendar size={14} className="text-zinc-500 shrink-0" />
            <span>{formatDate(quiz.quiz_date)}</span>
            {quiz.quiz_time && (
              <>
                <Clock size={14} className="text-zinc-500 ml-1 shrink-0" />
                <span>{formatTime(quiz.quiz_time)}h</span>
              </>
            )}
          </div>
        )}

        {quiz.location && (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <MapPin size={14} className="text-zinc-500 shrink-0" />
            <span className="truncate">{quiz.location}{quiz.address ? `, ${quiz.address}` : ''}</span>
          </div>
        )}

        <div className="flex items-center gap-4 pt-1">
          <div className="flex items-center gap-1.5 text-sm text-zinc-400">
            <Banknote size={14} className="text-zinc-500" />
            <span>{formatPrice(quiz.entry_fee)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-zinc-400">
            <Users size={14} className="text-zinc-500" />
            <span>{quiz.min_team_members}-{quiz.max_team_members} clanova</span>
          </div>
        </div>
      </div>
    </Link>
  )
}
