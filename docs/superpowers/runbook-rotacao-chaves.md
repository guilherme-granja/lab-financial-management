# Runbook — Rotação de Credenciais de Usuário

## Quando usar
- Suspeita de comprometimento da anon key de um usuário
- Solicitação do próprio usuário
- Rotação periódica de segurança

## Passo a passo

### 1. Gerar nova anon key no Supabase
1. Acesse https://supabase.com/dashboard/project/<project_ref>/settings/api
2. Em "Project API keys", clique em "Roll" na chave `anon public`
3. Confirme a operação — a chave antiga é imediatamente invalidada
4. Copie a nova chave

### 2. Atualizar no chore via Claude Code
```
supabase-chore execute_sql:
UPDATE user_databases
  SET supabase_anon_key = '<nova_key>',
      updated_at = now()
  WHERE user_id = (SELECT id FROM profiles WHERE email = '<email_do_usuario>');
```

### 3. Comunicar ao usuário
O usuário precisa fazer logout e login novamente. O novo `DatabaseConfig` será carregado automaticamente na próxima sessão.

### 4. Verificar
Após o login do usuário, confirmar em `activity_log` que um `login` foi registrado com sucesso.

## Notas
- A anon key é pública por design do Supabase — ela aparece no bundle JavaScript de qualquer cliente web. Rotacioná-la invalida sessões ativas mas não protege dados já expostos.
- A service role key (nunca armazenada no frontend ou no chore) tem controles separados no dashboard do Supabase.
