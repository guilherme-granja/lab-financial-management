import { choreClient } from './chore-client'

interface IpifyResponse {
  ip: string
}

interface GeoJsResponse {
  city?: string
  region?: string
  country?: string
}

async function collectLoginMetadata(): Promise<Record<string, unknown>> {
  const metadata: Record<string, unknown> = {
    user_agent: navigator.userAgent,
  }

  try {
    // Etapa 1: obter IP público via ipify (CORS liberado, sem rate limit prático)
    const ipRes = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(4000),
    })
    if (ipRes.ok) {
      const { ip } = (await ipRes.json()) as IpifyResponse
      if (ip) {
        metadata.ip = ip

        // Etapa 2: geolocalização via geojs usando o IP obtido
        try {
          const geoRes = await fetch(`https://get.geojs.io/v1/ip/geo/${ip}.json`, {
            signal: AbortSignal.timeout(4000),
          })
          if (geoRes.ok) {
            const geo = (await geoRes.json()) as GeoJsResponse
            metadata.city = geo.city ?? null
            metadata.region = geo.region ?? null
            metadata.country = geo.country ?? null
          }
        } catch {
          // geo falhou — continua só com IP
        }
      }
    }
  } catch {
    // IP falhou — continua só com user_agent
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
