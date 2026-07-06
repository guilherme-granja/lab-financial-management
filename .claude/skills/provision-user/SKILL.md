---
description: Provisiona o banco de dados de um novo usuário do Lab Finanças — adiciona o server no .mcp.json, aplica todas as migrations iniciais via MCP, e marca migrated: true no chore. Usar quando um novo usuário foi criado pelo admin (migrated: false) e precisa ter o banco configurado. Disparar quando o usuário pedir "provisionar banco do usuário X", "configurar banco do [email]", "rodar migrations para [nome]" ou similar.
when_to_use: Sempre que um novo usuário tiver sido criado via o formulário admin e o campo migrated estiver false. Nunca rodar sem confirmar o email/project_ref do usuário alvo.
---

# Skill — Provisionar banco de novo usuário

## Visão geral

Quando um novo usuário é criado pelo admin no formulário de `/admin/users`, o registro é inserido em `user_databases` com `migrated: false`. Esta skill provisiona o banco pessoal desse usuário usando exclusivamente MCP — sem Supabase CLI, sem connection string.

O provisionamento é dividido em **dois momentos** porque o Claude Code precisa ser reiniciado para carregar um novo MCP após adicioná-lo ao `.mcp.json`.

---

## MOMENTO 1 — Registrar o MCP (antes de reiniciar)

### Passo 0 — Confirmar usuário alvo

Buscar os dados do usuário no chore via MCP `supabase-chore`:

```sql
SELECT 
  p.id, p.name, p.email,
  ud.supabase_url, ud.supabase_project_ref, ud.migrated, ud.status
FROM profiles p
JOIN user_databases ud ON ud.user_id = p.id
WHERE p.email = '<email_informado>';
```

Exibir os dados e pedir confirmação antes de prosseguir:
> "Vou provisionar o banco **[project_ref]** para **[name]** ([email]). Confirma?"

- Se `migrated: true` → avisar que já foi provisionado. Perguntar se quer continuar mesmo assim.
- Se `status: paused` → avisar que o projeto está pausado e precisa ser reativado antes de continuar.

### Passo 1 — Perguntar o nome do server

Perguntar ao usuário:
> "Qual nome usar para o server MCP? Ex: `joao`, `ana`, `empresa` (o server será registrado como `supabase-client-<nome>`)"

Aguardar resposta antes de continuar.

### Passo 2 — Adicionar entry no .mcp.json

Ler o `.mcp.json` atual:
```bash
cat .mcp.json
```

Copiar o valor do campo `Authorization` de qualquer server `supabase-client-*` existente — é sempre o mesmo Bearer para todos.

Adicionar a nova entrada no objeto `mcpServers`, seguindo exatamente o padrão dos outros servers:

```json
"supabase-client-<nome>": {
  "type": "http",
  "url": "https://mcp.supabase.com/mcp?project_ref=<project_ref>",
  "headers": { "Authorization": "Bearer <mesmo_bearer_dos_outros>" }
}
```

Salvar o arquivo e confirmar ao usuário:
> "✅ Adicionado `supabase-client-<nome>` no `.mcp.json`.  
> **Reinicie o Claude Code agora** e depois peça para continuar o provisionamento do usuário [email]."

**Parar aqui. Não continuar até o usuário reiniciar e pedir para continuar.**

---

## MOMENTO 2 — Aplicar migrations (após reiniciar)

O usuário voltou após reiniciar o Claude Code. O MCP `supabase-client-<nome>` agora está disponível.

### Passo 3 — Aplicar migrations via MCP

Aplicar cada migration em ordem usando `apply_migration` no MCP `supabase-client-<nome>`. Ler o conteúdo de cada arquivo em `supabase/migrations/` e aplicar sequencialmente:

**Ordem obrigatória:**
1. `supabase/migrations/20260615150122_remote_schema.sql`
2. `supabase/migrations/20260615200000_accounts_and_transfers.sql`
3. `supabase/migrations/20260615210000_account_initial_balance.sql`
4. `supabase/migrations/20260616120000_category_parent.sql`
5. `supabase/migrations/20260616180000_tags.sql`
6. `supabase/migrations/20260616190000_duplicate_index.sql`
7. `supabase/migrations/20260618100000_fase1_transaction_types_tags_pivot.sql`
8. `supabase/migrations/20260618110000_fase2_recurrence_groups.sql`
9. `supabase/migrations/20260618120000_fase3_transaction_payments.sql`
10. `supabase/migrations/20260703104911_relax_rls_multitenant.sql`
11. `supabase/migrations/20260703200000_rls_hardening.sql`
12. `supabase/migrations/20260706100000_revert_rls_to_anon.sql`

> ⚠️ **Regra de RLS:** O estado final correto para bancos pessoais é `using (true)`. As migrations 10–12 se sobrepõem intencionalmente — o resultado final deve ser `using (true)` em todas as tabelas. Nunca usar `auth.uid() IS NOT NULL` nos bancos pessoais.

Se uma migration falhar com `already exists`, é normal — continuar para a próxima.

### Passo 4 — Marcar migrated: true no chore

Após todas as migrations aplicadas com sucesso, atualizar via MCP `supabase-chore`:

```sql
UPDATE user_databases
SET migrated = true
WHERE supabase_project_ref = '<project_ref>';
```

Confirmar:
```sql
SELECT p.name, p.email, ud.migrated, ud.status
FROM profiles p
JOIN user_databases ud ON ud.user_id = p.id
WHERE ud.supabase_project_ref = '<project_ref>';
```

### Passo 5 — Smoke test

Verificar que o schema foi aplicado corretamente via MCP `supabase-client-<nome>`:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Tabelas esperadas: `accounts`, `categories`, `goals`, `recurrence_groups`, `tags`, `transaction_payments`, `transaction_tags`, `transaction_types`, `transactions`.

Verificar seed de `transaction_types`:
```sql
SELECT slug FROM transaction_types ORDER BY slug;
```
Deve retornar: `expense`, `income`, `transfer`.

---

## Resumo do fluxo

```
MOMENTO 1 (antes de reiniciar):
  0. Confirmar usuário (email → project_ref, migrated: false)
  1. Perguntar nome do server
  2. Adicionar entry no .mcp.json → REINICIAR CLAUDE CODE

MOMENTO 2 (após reiniciar):
  3. Aplicar 12 migrations via apply_migration no MCP supabase-client-<nome>
  4. UPDATE migrated: true no chore via MCP supabase-chore
  5. Smoke test via MCP supabase-client-<nome>
```

---

## Erros comuns

| Erro | Causa | Fix |
|---|---|---|
| MCP `supabase-client-<nome>` não encontrado | Claude Code não foi reiniciado | Reiniciar e tentar novamente |
| `already exists` nas migrations | Banco parcialmente provisionado | Normal — continuar para a próxima |
| `migrated` não atualiza | Sem permissão no RLS do chore | Confirmar que está usando MCP `supabase-chore` |
| Migration falha com erro de sintaxe | Arquivo lido incorretamente | Ler o arquivo novamente com `cat` e retentar |