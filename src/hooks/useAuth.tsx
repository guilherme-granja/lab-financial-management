import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { choreClient } from '@/lib/chore-client'

interface AuthState {
  user: User | null
  loading: boolean
  signInWithGithub: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const handleUser = async (u: User | null) => {
    if (u) {
      const { data } = await choreClient
        .from('user_databases')
        .select('id')
        .eq('user_id', u.id)
        .eq('status', 'active')
        .maybeSingle()

      if (!data) {
        await choreClient.auth.signOut()
        setUser(null)
        setLoading(false)
        return
      }
    }
    setUser(u)
    setLoading(false)
  }

  useEffect(() => {
    choreClient.auth.getSession().then(({ data: { session } }) => {
      handleUser(session?.user ?? null)
    })

    const { data: { subscription } } = choreClient.auth.onAuthStateChange((_event, session) => {
      handleUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGithub = async () => {
    await choreClient.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/lab-financial-management/auth/callback`,
      },
    })
  }

  const signInWithPassword = async (email: string, password: string): Promise<string | null> => {
    const { error } = await choreClient.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  const signOut = async () => {
    await choreClient.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGithub, signInWithPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
