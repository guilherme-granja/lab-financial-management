import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { choreClient } from '@/lib/chore-client'
import { logActivity } from '@/lib/activity-log'

interface AuthState {
  user: User | null
  loading: boolean
  authError: string | null
  isAdmin: boolean
  firstLogin: boolean
  signInWithPassword: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
  clearFirstLogin: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [firstLogin, setFirstLogin] = useState(false)
  const hasRestoredSession = useRef(false)

  const handleUser = async (u: User | null) => {
    if (u) {
      const { data: profile } = await choreClient
        .from('profiles')
        .select('is_active, is_admin, first_login')
        .eq('id', u.id)
        .maybeSingle()

      if (!profile?.is_active) {
        await choreClient.auth.signOut()
        setUser(null)
        setIsAdmin(false)
        setAuthError('Sua conta está inativa. Entre em contato com o administrador.')
        setLoading(false)
        return
      }

      setIsAdmin(!!profile.is_admin)
      setFirstLogin(!!profile.first_login)

      if (!profile.is_admin) {
        const { data } = await choreClient
          .from('user_databases')
          .select('id')
          .eq('user_id', u.id)
          .eq('status', 'active')
          .maybeSingle()

        if (!data) {
          await choreClient.auth.signOut()
          setUser(null)
          setAuthError('Sua conta ainda não está configurada. Entre em contato com o administrador.')
          setLoading(false)
          return
        }
      }

      setAuthError(null)
    }
    setUser(u)
    setLoading(false)
  }

  useEffect(() => {
    choreClient.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        hasRestoredSession.current = true
      }
      handleUser(session?.user ?? null)
    })

    const { data: { subscription } } = choreClient.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        if (hasRestoredSession.current) {
          hasRestoredSession.current = false
        } else {
          logActivity(session.user.id, 'login')
        }
      }
      handleUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithPassword = async (email: string, password: string): Promise<string | null> => {
    setAuthError(null)
    const { error } = await choreClient.auth.signInWithPassword({ email, password })
    return error?.message ?? null
  }

  const signOut = async () => {
    await choreClient.auth.signOut()
    setUser(null)
    setIsAdmin(false)
  }

  const clearFirstLogin = async () => {
    await choreClient
      .from('profiles')
      .update({ first_login: false })
      .eq('id', user!.id)
    setFirstLogin(false)
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, authError, isAdmin, firstLogin, signInWithPassword, signOut, clearFirstLogin }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
