import { useEffect, useRef, useState } from 'react'
import { choreClient } from '@/lib/chore-client'
import type { BlogPost } from '@/types'

interface UseBlogPostsResult {
  posts: BlogPost[]
  loading: boolean
  error: string | null
  query: string
  setQuery: (q: string) => void
}

export function useBlogPosts(): UseBlogPostsResult {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const requestId = useRef(0)

  useEffect(() => {
    const trimmed = query.trim()
    setLoading(true)
    setError(null)
    const currentRequest = ++requestId.current

    const timer = setTimeout(async () => {
      let q = choreClient
        .from('blog_posts')
        .select('id, slug, title, excerpt, content, related_screen, published_at, created_at')
        .order('published_at', { ascending: false })

      if (trimmed.length >= 2) {
        q = q.or(`title.ilike.%${trimmed}%,content.ilike.%${trimmed}%`)
      }

      const { data, error: err } = await q

      if (currentRequest !== requestId.current) return

      if (err) {
        setError(err.message)
      } else {
        setPosts((data ?? []) as BlogPost[])
      }
      setLoading(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  return { posts, loading, error, query, setQuery }
}
