import { useState, useEffect, useCallback } from 'react'
import { choreClient } from '@/lib/chore-client'

export interface AdminUser {
  id: string
  name: string
  email: string
  is_admin: boolean
  is_active: boolean
  created_at: string
  // da user_databases (pode não existir para usuário admin sem banco)
  db_id: string | null
  supabase_url: string | null
  supabase_anon_key: string | null
  project_ref: string | null
  migrated: boolean | null
}

export interface CreateUserPayload {
  name: string
  email: string
  password: string
  supabase_url: string
  supabase_anon_key: string
  project_ref: string
  is_admin: boolean
}

interface UserDatabaseRow {
  id: string
  supabase_url: string
  supabase_anon_key: string
  supabase_project_ref: string | null
  migrated: boolean
}

interface ProfileRow {
  id: string
  name: string | null
  email: string
  is_admin: boolean
  is_active: boolean
  created_at: string
  user_databases: UserDatabaseRow[] | UserDatabaseRow | null
}

export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await choreClient
      .from('profiles')
      .select(`
        id,
        name,
        email,
        is_admin,
        is_active,
        created_at,
        user_databases (
          id,
          supabase_url,
          supabase_anon_key,
          supabase_project_ref,
          migrated
        )
      `)
      .order('created_at', { ascending: true })

    if (err) {
      setError(err.message)
    } else {
      const mapped: AdminUser[] = ((data ?? []) as unknown as ProfileRow[]).map((p) => {
        const db = Array.isArray(p.user_databases) ? p.user_databases[0] : p.user_databases
        return {
          id: p.id,
          name: p.name ?? '',
          email: p.email,
          is_admin: p.is_admin,
          is_active: p.is_active,
          created_at: p.created_at,
          db_id: db?.id ?? null,
          supabase_url: db?.supabase_url ?? null,
          supabase_anon_key: db?.supabase_anon_key ?? null,
          project_ref: db?.supabase_project_ref ?? null,
          migrated: db?.migrated ?? null,
        }
      })
      setUsers(mapped)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // ponytail: sem service role key no client (VITE_ = bundle público, admin.createUser exigiria expor ela).
  // Criação de usuário requer uma Edge Function no chore rodando com service role no servidor.
  async function createUser(_payload: CreateUserPayload): Promise<void> {
    throw new Error(
      'Criação de usuário ainda não implementada: requer Edge Function no chore com service role key (não pode rodar no client).',
    )
  }

  async function toggleActive(userId: string, is_active: boolean): Promise<void> {
    const { error: err } = await choreClient.from('profiles').update({ is_active }).eq('id', userId)
    if (err) throw new Error(err.message)
    await fetchUsers()
  }

  async function markMigrated(dbId: string): Promise<void> {
    const { error: err } = await choreClient
      .from('user_databases')
      .update({ migrated: true })
      .eq('id', dbId)
    if (err) throw new Error(err.message)
    await fetchUsers()
  }

  return { users, loading, error, createUser, toggleActive, markMigrated, refresh: fetchUsers }
}
