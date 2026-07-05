import { choreClient } from './chore-client'

export interface DatabaseConfig {
  url: string
  anonKey: string
}

export class PausedProjectError extends Error {
  constructor(public readonly projectRef: string) {
    super('paused')
    this.name = 'PausedProjectError'
  }
}

export interface DatabaseConfigResolver {
  getConfig(): Promise<DatabaseConfig>
}

export class EnvDatabaseConfigResolver implements DatabaseConfigResolver {
  async getConfig(): Promise<DatabaseConfig> {
    const url = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!url || !anonKey) {
      throw new Error(
        'Configuração do Supabase ausente: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY'
      )
    }

    return { url, anonKey }
  }
}

export class ChoreDatabaseConfigResolver implements DatabaseConfigResolver {
  constructor(private userId: string) {}

  async getConfig(): Promise<DatabaseConfig> {
    const { data, error } = await choreClient
      .from('user_databases')
      .select('supabase_url, supabase_anon_key, supabase_project_ref')
      .eq('user_id', this.userId)
      .eq('status', 'active')
      .single()

    if (error || !data) {
      const { data: pausedRow } = await choreClient
        .from('user_databases')
        .select('supabase_project_ref')
        .eq('user_id', this.userId)
        .eq('status', 'paused')
        .maybeSingle()

      if (pausedRow) {
        throw new PausedProjectError(pausedRow.supabase_project_ref ?? '')
      }

      throw new Error('Não foi possível carregar a configuração do banco do usuário.')
    }

    let paused = false
    try {
      const res = await fetch(`${data.supabase_url}/rest/v1/`, {
        headers: { apikey: data.supabase_anon_key },
      })
      paused = res.status === 503 || res.status === 404
    } catch {
      // Erro de rede ou timeout — não bloquear o login, continuar com a config
    }

    if (paused) {
      try {
        await choreClient
          .from('user_databases')
          .update({ status: 'paused', paused_at: new Date().toISOString() })
          .eq('user_id', this.userId)
      } catch {
        // best-effort: falha ao gravar não deve impedir o alerta de pausado
      }
      throw new PausedProjectError(data.supabase_project_ref ?? '')
    }

    return { url: data.supabase_url, anonKey: data.supabase_anon_key }
  }
}
