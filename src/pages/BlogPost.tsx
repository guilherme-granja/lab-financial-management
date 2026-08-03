import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft } from 'lucide-react'
import { useBlogPost } from '@/hooks/useBlogPost'
import { formatDate } from '@/lib/formatters'
import { Button } from '@/components/ui/button'

const SCREEN_LABELS: Record<string, string> = {
  budgets: 'Orçamentos',
  transactions: 'Transações',
  accounts: 'Contas',
  categories: 'Categorias',
}

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { post, loading, error } = useBlogPost(slug)

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        onClick={() => navigate('/blog')}
        className="text-slate-400 hover:text-slate-200 gap-1.5 -ml-2"
      >
        <ArrowLeft size={16} />
        Voltar
      </Button>

      {loading && <p className="text-slate-500 text-sm">Carregando...</p>}
      {!loading && error && <p className="text-red-400 text-sm">{error}</p>}
      {!loading && !error && !post && (
        <p className="text-slate-400 text-sm">Post não encontrado.</p>
      )}

      {!loading && post && (
        <div className="max-w-2xl">
          {post.related_screen && SCREEN_LABELS[post.related_screen] && (
            <span className="inline-block text-[10.5px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-0.5 rounded-full mb-3">
              {SCREEN_LABELS[post.related_screen]}
            </span>
          )}
          <h1 className="text-2xl font-bold text-slate-100 leading-tight mb-2">{post.title}</h1>
          <p className="text-slate-500 text-xs mb-7">{formatDate(post.published_at)}</p>

          <div className="prose-blog">
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
