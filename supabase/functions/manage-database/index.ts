import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DatabaseDetailsResponse {
  compute: string | null
  lastBackup: { insertedAt: string; status: string } | null
  egressBytes: number | null
  mau: number | null
}

// Investigado em 2026-07-21 com PAT real contra os 3 projetos clientes (Free plan):
// - GET /v1/projects/{ref}/billing/addons: `selected_addons` vem vazio nos 3 (Free plan não
//   seleciona addon de compute explicitamente) -> compute fica null nesse caso.
// - GET /v1/projects/{ref}/database/backups: `backups` vem vazio nos 3 (normal no Free, sem PITR).
// - GET /v0/projects/metrics: retorna 401 Unauthorized com o mesmo PAT que funciona pros outros
//   dois endpoints (confirmado via curl direto) -> endpoint não documentado, sem escopo liberado
//   pra esse token. egressBytes/mau ficam sempre null até a Supabase liberar/documentar o acesso.
async function fetchDatabaseDetails(projectRef: string, managementToken: string): Promise<DatabaseDetailsResponse> {
  const authHeaders = { Authorization: `Bearer ${managementToken}` }

  const [addonsResult, backupsResult, metricsResult] = await Promise.allSettled([
    fetch(`https://api.supabase.com/v1/projects/${projectRef}/billing/addons`, { headers: authHeaders }),
    fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/backups`, { headers: authHeaders }),
    fetch(`https://api.supabase.com/v0/projects/metrics`, { headers: authHeaders }),
  ])

  let compute: string | null = null
  if (addonsResult.status === 'fulfilled' && addonsResult.value.ok) {
    const addonsBody = await addonsResult.value.json() as {
      selected_addons?: { type: string; variant?: { name: string } }[]
    }
    const computeAddon = addonsBody.selected_addons?.find((a) => a.type === 'compute_instance')
    compute = computeAddon?.variant?.name ?? null
  }

  let lastBackup: DatabaseDetailsResponse['lastBackup'] = null
  if (backupsResult.status === 'fulfilled' && backupsResult.value.ok) {
    const backupsBody = await backupsResult.value.json() as {
      backups?: { inserted_at: string; status: string }[]
    }
    const backups = backupsBody.backups ?? []
    if (backups.length > 0) {
      const latest = [...backups].sort((a, b) => b.inserted_at.localeCompare(a.inserted_at))[0]
      lastBackup = { insertedAt: latest.inserted_at, status: latest.status }
    }
  }

  let egressBytes: number | null = null
  let mau: number | null = null
  if (metricsResult.status === 'fulfilled' && metricsResult.value.ok) {
    const metricsBody = await metricsResult.value.json() as Record<string, unknown>
    const projectMetrics = Array.isArray(metricsBody)
      ? metricsBody.find((m: Record<string, unknown>) => m.project_ref === projectRef || m.id === projectRef)
      : undefined
    if (projectMetrics) {
      egressBytes = typeof projectMetrics.EGRESS === 'number' ? projectMetrics.EGRESS : null
      mau = typeof projectMetrics.MONTHLY_ACTIVE_USERS === 'number' ? projectMetrics.MONTHLY_ACTIVE_USERS : null
    }
  }

  return { compute, lastBackup, egressBytes, mau }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const choreUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const adminClient = createClient(choreUrl, serviceRoleKey)

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userErr } = await adminClient.auth.getUser(token)
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: callerProfile, error: callerErr } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (callerErr || !callerProfile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Acesso restrito a administradores' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json() as { action: 'pause' | 'restore' | 'details'; user_id: string }
    if (body.action !== 'pause' && body.action !== 'restore' && body.action !== 'details') {
      return new Response(JSON.stringify({ error: "action deve ser 'pause', 'restore' ou 'details'" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (!body.user_id) {
      return new Response(JSON.stringify({ error: 'user_id é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: targetDb, error: targetErr } = await adminClient
      .from('user_databases')
      .select('supabase_project_ref')
      .eq('user_id', body.user_id)
      .single()

    if (targetErr || !targetDb?.supabase_project_ref) {
      return new Response(JSON.stringify({ error: 'Usuário sem banco de dados configurado' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const managementToken = Deno.env.get('SUPABASE_MANAGEMENT_API_TOKEN')!

    if (body.action === 'details') {
      const details = await fetchDatabaseDetails(targetDb.supabase_project_ref, managementToken)
      return new Response(JSON.stringify(details), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const endpoint = body.action === 'pause' ? 'pause' : 'restore'
    const mgmtRes = await fetch(
      `https://api.supabase.com/v1/projects/${targetDb.supabase_project_ref}/${endpoint}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${managementToken}` },
      }
    )

    if (!mgmtRes.ok) {
      const mgmtBody = await mgmtRes.text()
      return new Response(
        JSON.stringify({ error: `Falha na Management API: ${mgmtRes.status} ${mgmtBody}` }),
        {
          status: mgmtRes.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const newStatus = body.action === 'pause' ? 'paused' : 'active'
    const { error: updateErr } = await adminClient
      .from('user_databases')
      .update({
        status: newStatus,
        paused_at: body.action === 'pause' ? new Date().toISOString() : null,
      })
      .eq('user_id', body.user_id)

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ status: newStatus }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro desconhecido'
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
