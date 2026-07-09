import { choreClient } from './chore-client'

interface GeoData {
  city?: string
  region?: string
  country_name?: string
  ip?: string
  error?: boolean
}

async function collectLoginMetadata(): Promise<Record<string, unknown>> {
  const metadata: Record<string, unknown> = {
    user_agent: navigator.userAgent,
  }

  try {
    // ipapi.co retorna JSON com IP e geolocalização (sem chave de API)
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(5000) })
    if (res.ok) {
      const geo = (await res.json()) as GeoData
      if (!geo.error) {
        metadata.ip = geo.ip ?? null
        metadata.city = geo.city ?? null
        metadata.region = geo.region ?? null
        metadata.country = geo.country_name ?? null
      }
    }
  } catch {
    // falhou ao obter geo — continua sem
  }

  return metadata
}

export async function logActivity(
  userId: string,
  action: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    let enrichedMetadata = metadata ?? {}

    if (action === 'login') {
      const loginMeta = await collectLoginMetadata()
      enrichedMetadata = { ...loginMeta, ...metadata }
    }

    await choreClient.from('activity_log').insert({
      user_id: userId,
      action,
      metadata: Object.keys(enrichedMetadata).length > 0 ? enrichedMetadata : null,
    })
  } catch {
    // best-effort: log nunca pode quebrar a ação real do usuário
  }
}
