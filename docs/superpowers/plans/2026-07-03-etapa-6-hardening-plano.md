# Plano — Etapa 6: Hardening e Operação

**Data:** 2026-07-03
**Status:** Aprovado para spec
**Repositório:** guilherme-granja/lab-financial-management

---

## Contexto atual

O sistema multi-tenant está funcional com 3 projetos Supabase reais (chore + guilherme + malena) e um de teste (playwright). A Etapa 6 fecha os pontos de segurança, observabilidade e resiliência operacional que foram conscientemente deixados para depois durante a construção das etapas 1–5.

Estado atual por tópico:

| Tópico | Estado |
|---|---|
| RLS nos bancos pessoais | `using (true)` em todas as tabelas — isolamento só no nível de projeto |
| Projeto pausado (free tier) | Não detectado — erro genérico para o usuário |
| Testes E2E Playwright | Config existe (`playwright.config.ts`), 1 spec criada (`tests/admin-login.spec.ts`), não roda no CI |
| Activity log | `logActivity()` existe, registra `login` — sem tela de visualização no admin |
| Dashboard admin | Não existe — só `/admin/users` |
| Rotação de chaves | Sem mecanismo — anon keys estão em texto em `user_databases` |

---

## Escopo dividido em 5 áreas

### Área 1 — RLS nos bancos pessoais

**Situação:** A migration `20260703104911_relax_rls_multitenant.sql` removeu as políticas `auth only` e colocou `using (true)` em todas as tabelas dos bancos pessoais. Isso foi proposital — isolamento é no nível de projeto Supabase, não por linha. A decisão está correta para a arquitetura atual.

**O que fazer:**
- Adicionar política `using (auth.uid() IS NOT NULL)` em vez de `using (true)` — ainda funciona no multi-tenant (o usuário está sempre autenticado quando acessa seu banco), mas impede acesso anônimo não autenticado ao banco pessoal caso alguém obtenha a anon key.
- Aplicar nos bancos de guilherme, malena e playwright. O banco chore tem suas próprias políticas já corretas.
- Criar uma migration SQL padronizada que pode ser reaplicada em novos bancos de usuários quando provisionados.

**Specs:** 1 spec com 1 task por banco (3 migrations sequenciais). Pode ser aplicado via Claude Code diretamente com `supabase-client-guilherme`, `supabase-client-malena` e `supabase-client-test`.

---

### Área 2 — Detecção de projeto pausado (free tier)

**Situação:** Projetos Supabase free tier pausam após 1 semana de inatividade. Quando isso acontece, o `ChoreDatabaseConfigResolver.getConfig()` retorna erro genérico e o usuário vê tela branca ou mensagem de erro técnica.

**O que fazer:**

**Backend:** Adicionar coluna `paused_at timestamptz` em `user_databases` no chore. Quando o `getConfig()` falha, tentar identificar se é um projeto pausado (erro HTTP 503 ou corpo específico do Supabase). Se confirmado, registrar `paused_at = now()` e `status = 'paused'` no chore.

**Frontend:** No `ChoreDatabaseConfigResolver.getConfig()`, tratar o erro de projeto pausado especificamente:
- Status `'paused'` em `user_databases` → exibir mensagem clara: *"Seu banco de dados está temporariamente pausado. Acesse o dashboard do Supabase para reativá-lo."* com link `https://supabase.com/dashboard/project/<project_ref>/settings/general`.
- Distinguir de erro de configuração ausente (mensagem diferente).

**Admin:** Na tabela de usuários em `/admin/users`, exibir badge "Pausado" quando `status = 'paused'`, substituindo o badge "Migrado/Pendente".

**Specs:** 1 spec — migration chore (coluna `paused_at` + atualização de status), resolver, mensagem de erro na UI.

---

### Área 3 — Testes E2E Playwright multi-tenant

**Situação:** `playwright.config.ts` existe. `tests/admin-login.spec.ts` existe (gerada pela spec de fix de auth) mas não roda no CI. Não há testes E2E para fluxo de usuário normal (login → dashboard → transações).

**O que fazer:**

**Novos specs de teste:**
- `tests/user-flow.spec.ts` — usuário `playwright@lfm.local` faz login, vê dashboard, cria uma transação, verifica na listagem, deleta.
- `tests/admin-flow.spec.ts` — admin faz login, vê `/admin/users`, cria usuário (stub — apenas verifica que o modal abre e valida campos).
- `tests/auth-guards.spec.ts` — usuário normal tenta acessar `/admin/users` → redirecionado; usuário não autenticado tenta acessar `/` → redirecionado para `/login`.

**CI:** Adicionar job `e2e` no `.github/workflows/ci.yml` após o job `test`, antes do `deploy`. O job:
- Faz `npm run build && npm run preview &` (sobe o servidor local)
- Aguarda o servidor (`wait-on`)
- Roda `playwright test`
- Usa secrets `PLAYWRIGHT_ADMIN_PASSWORD` e `PLAYWRIGHT_USER_PASSWORD`

**Specs:** 1 spec — 3 arquivos de teste + CI.

---

### Área 4 — Observabilidade: activity log + dashboard admin

**Situação:** `logActivity()` existe e registra `login`. A tabela `activity_log` no chore existe com RLS permitindo leitura ampla para admins. Não existe página `/admin` (dashboard) nem `/admin/activity` — só `/admin/users`.

**O que fazer:**

**Expandir `logActivity()`:** Já é chamado no login. Adicionar chamadas nas operações de escrita nos hooks de dados:
- `useTransactions` → `transaction_created`, `transaction_updated`, `transaction_deleted`
- `useAdminUsers` → `user_created`, `user_activated`, `user_deactivated`, `user_migrated`

**Página `/admin` — Dashboard:** Card "Total de Usuários" + tabela das 10 atividades mais recentes de `activity_log` (join `profiles` para nome/email). Link "Ver todas" para `/admin/activity`.

**Página `/admin/activity` — Logs:** Tabela paginada de `activity_log` com filtro por usuário e tipo de ação. Colunas: Usuário, Ação (badge), Metadado, Data.

**Hook `useActivityLog`:** Novo hook no chore para buscar logs com paginação.

**Specs:** 2 specs — Spec A (expandir logActivity + useActivityLog + rota no router + sidebar), Spec B (páginas Dashboard admin + ActivityLog).

---

### Área 5 — Rotação de chaves / segurança de credenciais

**Situação:** `supabase_anon_key` e `supabase_url` ficam em texto plano em `user_databases` no chore. A anon key do Supabase não é um segredo crítico (é pública por design — fica no bundle do cliente), mas vale documentar e adicionar uma camada de auditoria.

**O que fazer (scope realista para free tier):**

Não implementar criptografia simétrica agora — exige vault ou KMS que adiciona complexidade sem ganho prático já que a anon key é pública. O que faz sentido:

1. **Auditoria de acesso à anon key:** Registrar em `activity_log` quando um admin visualiza/copia a anon key de um usuário (`admin_viewed_credentials`). Implementar no botão de copiar do modal de `/admin/users`.

2. **Documentação de rotação:** Criar `docs/superpowers/runbook-rotacao-chaves.md` — passo a passo de como trocar a anon key de um usuário: gerar nova key no Supabase → atualizar `user_databases` via admin → usuário faz logout/login para pegar nova config.

3. **Validação de credenciais ao salvar:** Quando admin cria/edita usuário, antes de salvar no banco, fazer um ping no projeto Supabase informado (`GET /rest/v1/` com a anon key) para confirmar que as credenciais são válidas. Erro → impedir salvamento com mensagem clara.

**Specs:** 1 spec — auditoria de visualização de key + validação de credenciais ao criar usuário + runbook.

---

## Ordem de execução

```
Área 1 — RLS                    → pode rodar agora (independente)
Área 2 — Projeto pausado        → pode rodar agora (independente)
Área 5 — Rotação/segurança      → pode rodar após Área 2 (depende do status 'paused' para testar)

Área 4A — logActivity expand    → pode rodar agora
Área 4B — Páginas admin         → depende de 4A estar commitada

Área 3 — Playwright E2E         → depende de tudo estar estável; rodar por último
```

**Paralelismo possível:** Áreas 1 + 2 + 4A em paralelo. Área 5 após 2. Área 4B após 4A. Área 3 por último.

---

## Decisão necessária antes da Área 2

A coluna `status` em `user_databases` já existe? O `ChoreDatabaseConfigResolver` já filtra por `.eq('status', 'active')` — o schema do chore precisa ser confirmado antes de gerar a spec de pausado. Claude Code deve verificar via MCP antes de implementar.

---

## Não-escopo desta etapa

- Criptografia de anon key (Vault/KMS) — complexidade não justificada para free tier
- Notificações por email quando projeto pausa — sem SMTP configurado
- Migração automática via GitHub Actions — decidido como melhoria futura
- Testes de carga/performance — fora do perfil do produto atual

---

## Specs a gerar

| Ref | Nome | Área | Modelo |
|---|---|---|---|
| 6.1 | RLS hardening nos bancos pessoais | 1 | Sonnet padrão |
| 6.2 | Detecção e UX de projeto pausado | 2 | Sonnet 4.6 High |
| 6.3A | Expand logActivity + useActivityLog + rotas | 4 | Sonnet 4.6 High |
| 6.3B | Páginas /admin e /admin/activity | 4 | Sonnet 4.6 High |
| 6.4 | Segurança de credenciais + runbook | 5 | Sonnet padrão |
| 6.5 | Testes E2E Playwright + CI | 3 | Sonnet 4.6 High |

