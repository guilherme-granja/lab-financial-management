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
