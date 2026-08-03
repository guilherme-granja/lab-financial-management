import { useEffect, useState, useCallback } from 'react'
import { choreClient } from '@/lib/chore-client'
import type { BlogPost } from '@/types'

export function useBlogPost(slug: string | undefined) {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(!!slug)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!slug) {
      setPost(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: err } = await choreClient
      .from('blog_posts')
      .select('id, slug, title, excerpt, content, related_screen, published_at, created_at')
      .eq('slug', slug)
      .maybeSingle()

    if (err) setError(err.message)
    setPost((data as BlogPost) ?? null)
    setLoading(false)
  }, [slug])

  useEffect(() => { fetch() }, [fetch])

  return { post, loading, error }
}
