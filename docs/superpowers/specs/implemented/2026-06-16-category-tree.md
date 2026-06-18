# SPEC — Categorias e Subcategorias

**Data:** 2026-06-16
**Arquivos afetados:**
- `supabase/migrations/YYYYMMDDHHMMSS_category_parent.sql`
- `src/types/index.ts`
- `src/hooks/useCategories.ts`
- `src/pages/Categories.tsx`
- `src/hooks/useTransactions.ts`
- `src/pages/Transactions.tsx`
- `src/pages/Reports.tsx`

**Não tocar em:**
- `src/hooks/useAccounts.ts`
- `src/pages/Accounts.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Goals.tsx`

---

## Contexto

A tabela `categories` tem 9 registros sem `parent_id`. Todas as categorias são flat — não há hierarquia. Existem 102 transações, sendo 96 vinculadas a "Salário" e 5 a "Pix". As demais categorias não têm transações. O objetivo é adicionar dois níveis (grupo → subcategoria) sem quebrar as transações existentes.

---

## Task 1 — Migration: adicionar parent_id e seed de subcategorias

**Arquivo:** `supabase/migrations/YYYYMMDDHHMMSS_category_parent.sql`

Criar o arquivo e aplicar com `npx supabase db push` **antes de qualquer outra task**.

```sql
-- Adicionar parent_id (self-reference)
ALTER TABLE categories
  ADD COLUMN parent_id uuid REFERENCES categories(id) ON DELETE CASCADE;

-- Subcategorias de Salário
INSERT INTO categories (name, icon, color, type, parent_id)
SELECT name, icon, color, type,
  (SELECT id FROM categories WHERE name = 'Salário' LIMIT 1)
FROM (VALUES
  ('Salário CLT',  '💼', '#22c55e', 'income'),
  ('Pró-labore',   '🏢', '#22c55e', 'income'),
  ('13º Salário',  '🎄', '#22c55e', 'income'),
  ('Férias',       '🏖️', '#22c55e', 'income')
) AS t(name, icon, color, type);

-- Subcategorias de Pix
INSERT INTO categories (name, icon, color, type, parent_id)
SELECT name, icon, color, type,
  (SELECT id FROM categories WHERE name = 'Pix' LIMIT 1)
FROM (VALUES
  ('Pix Recebido', '📲', '#0f8011', 'income'),
  ('Pix Enviado',  '📤', '#0f8011', 'expense')
) AS t(name, icon, color, type);

-- Subcategorias de Alimentação
INSERT INTO categories (name, icon, color, type, parent_id)
SELECT name, icon, color, type,
  (SELECT id FROM categories WHERE name = 'Alimentação' LIMIT 1)
FROM (VALUES
  ('Supermercado',         '🛒', '#f97316', 'expense'),
  ('Padaria / Mercearia',  '🥖', '#f97316', 'expense'),
  ('Feira / Hortifruti',   '🥦', '#f97316', 'expense'),
  ('Delivery',             '🛵', '#f97316', 'expense'),
  ('Viagens — Alimentação','🍽️', '#f97316', 'expense')
) AS t(name, icon, color, type);

-- Subcategorias de Educação
INSERT INTO categories (name, icon, color, type, parent_id)
SELECT name, icon, color, type,
  (SELECT id FROM categories WHERE name = 'Educação' LIMIT 1)
FROM (VALUES
  ('Cursos e Assinaturas', '🎓', '#6366f1', 'expense'),
  ('Livros',               '📖', '#6366f1', 'expense'),
  ('Escola / Faculdade',   '🏫', '#6366f1', 'expense')
) AS t(name, icon, color, type);

-- Subcategorias de Lazer
INSERT INTO categories (name, icon, color, type, parent_id)
SELECT name, icon, color, type,
  (SELECT id FROM categories WHERE name = 'Lazer' LIMIT 1)
FROM (VALUES
  ('Restaurantes e Bares', '🍺', '#eab308', 'expense'),
  ('Streaming',            '📺', '#eab308', 'expense'),
  ('Viagens — Hospedagem', '🏨', '#eab308', 'expense'),
  ('Viagens — Transporte', '✈️', '#eab308', 'expense'),
  ('Eventos e Shows',      '🎟️', '#eab308', 'expense'),
  ('Hobbies',              '🎮', '#eab308', 'expense')
) AS t(name, icon, color, type);

-- Subcategorias de Moradia
INSERT INTO categories (name, icon, color, type, parent_id)
SELECT name, icon, color, type,
  (SELECT id FROM categories WHERE name = 'Moradia' LIMIT 1)
FROM (VALUES
  ('Aluguel',          '🏠', '#06b6d4', 'expense'),
  ('Condomínio',       '🏢', '#06b6d4', 'expense'),
  ('Energia Elétrica', '⚡', '#06b6d4', 'expense'),
  ('Água e Esgoto',    '💧', '#06b6d4', 'expense'),
  ('Internet',         '📡', '#06b6d4', 'expense'),
  ('Gás',              '🔥', '#06b6d4', 'expense')
) AS t(name, icon, color, type);

-- Subcategorias de Outros
INSERT INTO categories (name, icon, color, type, parent_id)
SELECT name, icon, color, type,
  (SELECT id FROM categories WHERE name = 'Outros' LIMIT 1)
FROM (VALUES
  ('Doações',          '🤝', '#64748b', 'expense'),
  ('Presentes',        '🎁', '#64748b', 'expense'),
  ('Não Categorizado', '❓', '#64748b', 'both')
) AS t(name, icon, color, type);

-- Subcategorias de Saúde
INSERT INTO categories (name, icon, color, type, parent_id)
SELECT name, icon, color, type,
  (SELECT id FROM categories WHERE name = 'Saúde' LIMIT 1)
FROM (VALUES
  ('Plano de Saúde',     '🏥', '#ec4899', 'expense'),
  ('Farmácia',           '💊', '#ec4899', 'expense'),
  ('Consultas / Exames', '🩺', '#ec4899', 'expense'),
  ('Academia',           '💪', '#ec4899', 'expense')
) AS t(name, icon, color, type);

-- Subcategorias de Transporte
INSERT INTO categories (name, icon, color, type, parent_id)
SELECT name, icon, color, type,
  (SELECT id FROM categories WHERE name = 'Transporte' LIMIT 1)
FROM (VALUES
  ('Combustível',         '⛽', '#8b5cf6', 'expense'),
  ('Uber / 99',           '🚕', '#8b5cf6', 'expense'),
  ('Estacionamento',      '🅿️', '#8b5cf6', 'expense'),
  ('Manutenção do Carro', '🔧', '#8b5cf6', 'expense'),
  ('Transporte Público',  '🚌', '#8b5cf6', 'expense')
) AS t(name, icon, color, type);
```

> Usar `SELECT id FROM categories WHERE name = 'X'` em vez de hardcodar UUIDs.

---

## Task 2 — Types: adicionar parent_id e subcategories em Category

**Arquivo:** `src/types/index.ts`

Adicionar `parent_id` e `subcategories` na interface `Category` existente. Não alterar nenhuma outra interface.

```ts
export interface Category {
  id: string
  name: string
  color: string
  icon: string
  type: CategoryType
  parent_id: string | null        // novo
  created_at: string
  subcategories?: Category[]      // novo — populado no frontend
}
```

---

## Task 3 — Hook: fetchCategoryTree

**Arquivo:** `src/hooks/useCategories.ts`

Manter `fetchCategories()` existente sem alteração. Adicionar `fetchCategoryTree()` ao lado:

```ts
// Retorna apenas grupos pai com subcategories[] aninhadas
async function fetchCategoryTree(): Promise<Category[]> {
  const { data } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  const parents = data?.filter(c => c.parent_id === null) ?? []
  const children = data?.filter(c => c.parent_id !== null) ?? []

  return parents.map(p => ({
    ...p,
    subcategories: children.filter(c => c.parent_id === p.id),
  }))
}
```

Expor `fetchCategoryTree` no retorno do hook junto com os demais métodos existentes.

---

## Task 4 — Página: Categories com estrutura pai/filho

**Arquivo:** `src/pages/Categories.tsx`

Substituir o grid flat atual por lista agrupada:
- Grupo pai → header de seção com nome, ícone e cor
- Subcategorias → cards menores abaixo do grupo pai
- Botão "Novo grupo" (cria com `parent_id = null`)
- Botão "Nova subcategoria" em cada seção (Dialog com `parent_id` pré-preenchido)
- Ao criar subcategoria, pré-preencher `color` com a cor do grupo pai (editável)
- Exclusão de grupo que tem subcategorias → bloquear com alerta: "Remova as subcategorias antes de excluir o grupo."
- Exclusão de subcategoria → confirmação simples

No modal de criar/editar, adicionar campo `parent_id` (Select):
- Opção "Grupo principal (sem pai)" → `parent_id = null`
- Lista de categorias com `parent_id = null` como opções

---

## Task 5 — Transactions e Reports: select agrupado e toggle de relatório

**Arquivos:** `src/pages/Transactions.tsx` e `src/pages/Reports.tsx`

**Em Transactions.tsx** — no modal de nova/editar transação e no filtro de categoria da listagem, substituir o Select simples pelo select agrupado:
- Grupos pai como separadores visuais não clicáveis (`optgroup` ou componente equivalente)
- Subcategorias como opções selecionáveis dentro do grupo
- Grupos pai sem subcategorias → selecionáveis (compatibilidade com transações legadas)
- Usar `fetchCategoryTree()` para montar o select

**Em Reports.tsx** — adicionar toggle acima da tabela de resumo:
- "Por grupo" → agrupar por `parent_id`, somar subcategorias do mesmo grupo
- "Por subcategoria" → comportamento atual (detalhe individual)
- Padrão: "Por grupo"

Não reescrever nenhum dos dois arquivos inteiros — alterar apenas os trechos de seleção de categoria e a tabela de relatório.

---

## Checklist

- [ ] Task 1 — Migration aplicada (`npx supabase db push` com sucesso)
- [ ] Task 2 — Types atualizados
- [ ] Task 3 — `fetchCategoryTree()` adicionado
- [ ] Task 4 — Categories.tsx com estrutura pai/filho
- [ ] Task 5 — Select agrupado em Transactions + toggle em Reports
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat: category tree with parent/child structure"`
- [ ] `git push origin main && npm run deploy`