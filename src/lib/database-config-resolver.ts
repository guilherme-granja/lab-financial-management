import { choreClient } from './chore-client'

export interface DatabaseConfig {
  url: string
  anonKey: string
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
      .select('supabase_url, supabase_anon_key')
      .eq('user_id', this.userId)
      .eq('status', 'active')
      .single()

    if (error || !data) {
      throw new Error('Não foi possível carregar a configuração do banco do usuário.')
    }

    return { url: data.supabase_url, anonKey: data.supabase_anon_key }
  }
}
