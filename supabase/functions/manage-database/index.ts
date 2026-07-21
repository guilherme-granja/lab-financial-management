import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const body = await req.json() as { action: 'pause' | 'restore'; user_id: string }
    if (body.action !== 'pause' && body.action !== 'restore') {
      return new Response(JSON.stringify({ error: "action deve ser 'pause' ou 'restore'" }), {
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
