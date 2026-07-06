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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const callerClient = createClient(choreUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
    if (callerErr || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile, error: profileErr } = await callerClient
      .from('profiles')
      .select('is_admin')
      .eq('id', caller.id)
      .single()

    if (profileErr || !profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json() as {
      name: string
      email: string
      password: string
      supabase_url?: string
      supabase_anon_key?: string
      project_ref?: string
      is_admin: boolean
    }

    if (!body.name || !body.email || !body.password) {
      return new Response(JSON.stringify({ error: 'name, email e password são obrigatórios' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(choreUrl, serviceRoleKey)

    const { data: authData, error: authErr } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    })
    if (authErr) throw new Error(authErr.message)

    const userId = authData.user.id

    const { error: profileUpsertErr } = await adminClient
      .from('profiles')
      .upsert({
        id: userId,
        name: body.name,
        email: body.email,
        is_admin: body.is_admin,
        is_active: true,
      })
    if (profileUpsertErr) throw new Error(profileUpsertErr.message)

    if (body.supabase_url && body.supabase_anon_key && body.project_ref) {
      const { error: dbErr } = await adminClient
        .from('user_databases')
        .insert({
          user_id: userId,
          supabase_url: body.supabase_url,
          supabase_anon_key: body.supabase_anon_key,
          supabase_project_ref: body.project_ref,
          migrated: false,
        })
      if (dbErr) throw new Error(dbErr.message)
    }

    await adminClient.from('activity_log').insert({
      user_id: caller.id,
      action: 'user_created',
      metadata: { target_user_id: userId, email: body.email, is_admin: body.is_admin },
    })

    return new Response(JSON.stringify({ user_id: userId }), {
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
