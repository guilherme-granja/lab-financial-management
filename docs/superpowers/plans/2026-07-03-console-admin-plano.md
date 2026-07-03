# Plano — Console de Admin

**Data:** 2026-07-03
**Status:** Rascunho para aprovação
**Fonte de design:** `admin/interfaces/` (5 telas: login-page, dashbord-page, user-managment-page com 2 estados, activity-log-page com 2 estados)

---

## Contexto

Mockups estáticos já existem no repo (HTML + screenshot + design tokens por tela). O backend já está parcialmente pronto de trabalho anterior: `profiles.is_admin`, `profiles.is_active`, tabela `activity_log` com RLS permitindo leitura ampla pra quem tem `is_admin = true`. Falta a parte de rotas/UI do admin em si.

---

## Rotas

| Rota | Tela (mockup) | Protegida |
|---|---|---|
| `/admin/login` | `login-page` | Não |
| `/admin` | `dashbord-page` | Sim (admin) |
| `/admin/usuarios` | `user-managment-page` | Sim (admin) |
| `/admin/atividade` | `activity-log-page` | Sim (admin) |

---

## Arquitetura de autenticação

Login do admin usa o **mesmo `choreClient`** (mesma sessão Supabase Auth do chore) que o app principal — não é um sistema de auth separado. O que muda é o **gate**: em vez de checar `user_databases` ativo (como o `useAuth` do app principal faz), checa `profiles.is_admin = true` e `profiles.is_active = true`.

Proposta: `AdminAuthProvider`/`useAdminAuth`, estruturalmente paralelo ao `AuthProvider`/`useAuth` que já existe (mesmo padrão de contexto + hook), mas com a checagem trocada. `AdminPrivateRoute` equivalente ao `PrivateRoute`, redirecionando pra `/admin/login` se não passar no gate. Isso significa que alguém pode estar logado no app principal (`/`) e no admin (`/admin`) ao mesmo tempo com a mesma sessão — é o comportamento esperado, já que é a mesma identidade no chore.

---

## Páginas

### `/admin` — Dashboard
Um card de métrica ("Total de Usuários" — `count(*)` em `profiles`) + tabela das atividades mais recentes de `activity_log` (join com `profiles` pro nome/e-mail), com link "Ver Tudo" pra `/admin/atividade`.

### `/admin/usuarios` — Gerenciamento de Usuários
Tabela: `profiles` LEFT JOIN `user_databases` (join à esquerda porque nem todo profile tem `user_databases` — ex: o próprio admin). Colunas do mockup: ID, Nome, E-mail, Status (badge Ativo/Inativo vindo de `is_active`), Supabase URL, Supabase Anon Key, Projeto Ref, Último Login, Criado em.

**"Último Login" não vem de `auth.users`** (não é acessível via client normal) — deriva de `activity_log`: `max(created_at) where action = 'login' and user_id = profiles.id`.

Botão "Adicionar Novo Usuário" existe no mockup, mas **sem formulário desenhado** — isso precisa ser definido antes da spec de implementação (ver Decisões Abertas).

### `/admin/atividade` — Logs de Atividade
Tabela paginada de `activity_log` (join `profiles`): Usuário, Ação, Metadado, Criado em. O mockup já prevê tipos de ação além dos que implementamos (`login`, `transaction_created/updated/deleted`) — inclui exemplos como "Usuário criado", "Configurações alteradas", "Registro removido", sinalizando que ações administrativas (criar/editar/desativar usuário) também devem gerar entradas nessa tabela quando a spec de CRUD de usuário for escrita.

---

## Decisões abertas (preciso da sua confirmação antes da primeira spec)

1. **Formulário de criar usuário**: o mockup só tem o botão, não a tela/modal. Como você descreveu antes ("inserir dados do novo usuário, criar tudo automaticamente"), preciso saber: modal na própria página de usuários, ou uma rota separada (`/admin/usuarios/novo`)? E quais campos exatamente — e-mail, senha, nome, e o quê mais sobre o banco pessoal dele (URL/anon key digitados manualmente, já que provisionar o banco em si continua sendo processo CLI separado, como decidimos antes)?
2. **Expor Supabase Anon Key na tabela**: o mockup mostra em texto puro. Como já estabelecemos, anon key não é segredo grave — mas ainda assim, uma tela de admin normalmente mascara valores desse tipo com um botão "mostrar/copiar" em vez de deixar sempre visível. Mantenho como no mockup (sempre visível) ou adiciono esse comportamento?
3. **Editar/desativar usuário existente**: a tabela mostra o Status, mas não vi no mockup nenhuma ação de editar/toggle na linha. Isso é intencional pra uma spec futura, ou deveria já entrar nesta primeira leva?

---

## Próximos passos

Depois de fechar as 3 decisões acima, a implementação fica em specs menores, nessa ordem sugerida:
1. Infraestrutura de auth do admin (`AdminAuthProvider`, `AdminPrivateRoute`, rotas)
2. Tela de login (`/admin/login`)
3. Dashboard (`/admin`)
4. Gerenciamento de usuários — listagem (`/admin/usuarios`, sem criar ainda)
5. Criar usuário (depende da decisão #1)
6. Logs de atividade (`/admin/atividade`)

Cada spec referencia a pasta de mockup correspondente e usa a skill `mockup-to-react` — sem HTML colado na spec.
