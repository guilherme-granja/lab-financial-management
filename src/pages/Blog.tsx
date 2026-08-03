import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useBlogPosts } from '@/hooks/useBlogPosts'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate } from '@/lib/formatters'

const SCREEN_LABELS: Record<string, string> = {
  budgets: 'Orçamentos',
  transactions: 'Transações',
  accounts: 'Contas',
  categories: 'Categorias',
}

export default function Blog() {
  const navigate = useNavigate()
  const { posts, loading, error, query, setQuery } = useBlogPosts()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-slate-200 font-semibold text-lg">Blog</h2>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar posts..."
          className="bg-[#1a1d27] border-[#2d3148] pl-9"
        />
      </div>

      {loading && <p className="text-slate-500 text-sm">Carregando...</p>}
      {!loading && error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && posts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-4xl mb-4">📭</span>
          <p className="text-slate-400 text-sm">
            {query.trim() ? `Nenhum post encontrado para "${query.trim()}".` : 'Nenhum post publicado ainda.'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {posts.map((post) => (
          <Card
            key={post.id}
            className="bg-[#1a1d27] border-[#2d3148] cursor-pointer hover:border-[#3d4260] transition-colors"
            onClick={() => navigate(`/blog/${post.slug}`)}
          >
            <CardContent className="p-4 space-y-2">
              {post.related_screen && SCREEN_LABELS[post.related_screen] && (
                <span className="inline-block text-[10.5px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                  {SCREEN_LABELS[post.related_screen]}
                </span>
              )}
              <p className="text-slate-200 font-semibold text-sm leading-snug">{post.title}</p>
              <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">{post.excerpt}</p>
              <p className="text-slate-500 text-[11px]">{formatDate(post.published_at)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
