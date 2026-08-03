import { useNavigate } from 'react-router-dom'
import { Newspaper, ArrowRight } from 'lucide-react'
import { useRelatedPosts } from '@/hooks/useRelatedPosts'

export function RelatedPosts({ screen }: { screen: string }) {
  const navigate = useNavigate()
  const { posts, loading } = useRelatedPosts(screen)

  if (loading || posts.length === 0) return null

  return (
    <div className="border-t border-[#2d3148] mt-6 pt-4">
      <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold uppercase tracking-wide mb-3">
        <Newspaper size={13} />
        Do blog
      </div>
      <div className="space-y-2">
        {posts.map((post) => (
          <div
            key={post.id}
            onClick={() => navigate(`/blog/${post.slug}`)}
            className="flex items-center justify-between gap-3 bg-[#16181f] border border-[#2d3148] hover:border-[#3d4260] rounded-lg px-3 py-2.5 cursor-pointer"
          >
            <div className="min-w-0">
              <p className="text-slate-200 text-[13px] font-medium truncate">{post.title}</p>
              <p className="text-slate-500 text-[11.5px] truncate">{post.excerpt}</p>
            </div>
            <ArrowRight size={14} className="text-slate-500 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
