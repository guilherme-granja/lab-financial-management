import { useEffect, useState } from 'react'
import { choreClient } from '@/lib/chore-client'
import type { BlogPost } from '@/types'

export function useRelatedPosts(screen: string) {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)

    choreClient
      .from('blog_posts')
      .select('id, slug, title, excerpt, content, related_screen, published_at, created_at')
      .eq('related_screen', screen)
      .order('published_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (!active) return
        setPosts((data ?? []) as BlogPost[])
        setLoading(false)
      })

    return () => { active = false }
  }, [screen])

  return { posts, loading }
}
