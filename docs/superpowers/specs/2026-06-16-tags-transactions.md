# SPEC — Tags em Transações

**Data:** 2026-06-16
**Arquivos afetados:**
- `supabase/migrations/20260616180000_tags.sql`
- `src/types/index.ts`
- `src/hooks/useTags.ts` *(novo)*
- `src/hooks/useTransactions.ts`
- `src/pages/Tags.tsx` *(novo)*
- `src/pages/Transactions.tsx`
- `src/router/index.tsx`
- `src/components/layout/Sidebar.tsx`

**Não tocar em:**
- `src/hooks/useCategories.ts`
- `src/pages/Categories.tsx`
- `src/pages/Dashboard.tsx`

**Modelo:** Sonnet 4.6 High

---

## Contexto

O sistema possui transações com categoria, conta e descrição, mas sem suporte a tags. Tags serão entidades próprias persistidas numa tabela `tags`, com relacionamento N:1 com `transactions` (uma transação tem no máximo uma tag; uma tag pode estar em várias transações). A feature inclui página de gestão de tags, campo opcional no form de criação/edição de transação, coluna na tabela e filtro por tag na tela de Transações.

---

## Task 1 — Migration

**Arquivo:** `supabase/migrations/20260616180000_tags.sql`
> Review: não

Criar o arquivo com o conteúdo abaixo e aplicar com `npx supabase db push` antes de prosseguir.

```sql
-- Tabela de tags
CREATE TABLE tags (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tags_name_unique UNIQUE (name)
);

-- RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage tags"
  ON tags FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Coluna na tabela de transações
ALTER TABLE transactions
  ADD COLUMN tag_id uuid REFERENCES tags(id) ON DELETE SET NULL;
```

---

## Task 2 — Types

**Arquivo:** `src/types/index.ts`
> Review: não

Adicionar a interface `Tag` e o campo `tag_id` / `tags` na interface `Transaction` existente. Não alterar nenhum outro tipo.

```ts
export interface Tag {
  id: string
  name: string
  created_at: string
}

// Acrescentar em Transaction:
tag_id: string | null
tags?: Tag
```

---

## Task 3 — Hook useTags

**Arquivo:** `src/hooks/useTags.ts` *(criar)*
> Review: não

Criar hook seguindo o mesmo padrão de `useCategories.ts`. Deve expor:

```ts
export function useTags() {
  // estados: tags, loading, error
  // fetch: SELECT * FROM tags ORDER BY name ASC
  // createTag(name: string): Promise<void>  — checa duplicidade antes de inserir (erro amigável: "Tag já existe")
  // deleteTag(id: string): Promise<void>
  return { tags, loading, error, createTag, deleteTag }
}
```

Restrições: não reescrever `useCategories`; apenas copiar o padrão (fetch no mount, refresh após mutação, throw em erro).

---

## Task 4 — Página Tags

**Arquivo:** `src/pages/Tags.tsx` *(criar)*
> Review: sim

Página de gestão de tags seguindo o layout padrão das demais páginas (`PageWrapper` + `Card` + `Table`). Funcionalidades:

- Listar todas as tags em tabela com colunas: **Nome** e **Ações** (botão excluir).
- Botão "Nova tag" abre Dialog com `Input` para o nome. Ao salvar, chama `createTag`; exibe erro inline se duplicada. Fecha dialog em sucesso.
- Botão excluir abre confirm dialog antes de chamar `deleteTag`.
- Estados obrigatórios: `loading`, `error`, `empty state`, `saving`, `formError`.

Referência visual (seguir o padrão de `Categories.tsx` — header com botão, tabela, dialogs de criar e confirmar exclusão).

---

## Task 5 — Hook useTransactions + página Transactions

**Arquivos:** `src/hooks/useTransactions.ts` e `src/pages/Transactions.tsx`
> Review: sim

### useTransactions.ts

1. Adicionar `tagId: string` (valor padrão `'all'`) em `TransactionFilters`.
2. Adicionar `tag_id: string | null` em `TransactionPayload`.
3. Atualizar `SELECT_FIELDS` para incluir `tags(*)`:
   ```ts
   const SELECT_FIELDS =
     '*, categories(*), accounts!account_id(*), to_accounts:accounts!to_account_id(*), tags(*)'
   ```
4. Aplicar filtro na query quando `filters.tagId !== 'all'`:
   ```ts
   if (filters.tagId !== 'all') {
     query = query.eq('tag_id', filters.tagId)
   }
   ```
5. Propagar `tag_id` em todos os payloads de `createTransaction` (simples, installment e fixed) e em `updateTransaction`.

Restrição: não alterar lógica de paginação, datas, recurrence ou pagamento.

### Transactions.tsx

1. Adicionar `tagId: 'all'` no estado inicial de `filters`.
2. Adicionar o campo `tag_id: ''` no estado inicial de `form`.
3. **Filtro na barra de filtros:** Select de tags (após o filtro de categoria), com opção "Todas as tags" (`value='all'`) e uma opção por tag. Chamar `useTags()` para popular.
4. **Coluna "Tag" na tabela:** após a coluna "Categoria", exibir `tx.tags?.name` com `<Badge>` de cor neutra (`bg-[#2d3148] text-slate-300`). Se sem tag, exibir `—`.
5. **Campo "Tag" no dialog de criação/edição:** Select opcional com `useTags()`, opção "Sem tag" (`value=''`). Posicionar após o campo Categoria.
6. Passar `tag_id: form.tag_id || null` no payload ao criar/editar.

Restrição: não alterar os dialogs de pagamento ou exclusão; não reescrever o componente inteiro — fazer adições cirúrgicas.

---

## Task 6 — Roteamento e Sidebar

**Arquivos:** `src/router/index.tsx` e `src/components/layout/Sidebar.tsx`
> Review: não

### router/index.tsx
Adicionar rota protegida `/tags` apontando para `<Tags />`. Seguir o padrão das rotas existentes (`/categories`, `/accounts`).

### Sidebar.tsx
Adicionar item de navegação "Tags" com ícone `Tag` (lucide-react) entre "Categorias" e "Metas" (ou ao final do grupo de cadastros). Seguir o padrão visual dos demais itens.

---

## Checklist

- [ ] Task 1 concluída — migration aplicada com `npx supabase db push`
- [ ] Task 2 concluída — tipos atualizados
- [ ] Task 3 concluída — `useTags` criado
- [ ] Task 4 concluída — página Tags funcionando
- [ ] Task 5 concluída — filtro, coluna e campo no form de Transações
- [ ] Task 6 concluída — rota e sidebar atualizados
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat: tags em transações"`
- [ ] `git push origin main && npm run deploy`