# SPEC-3 — Categorias e Subcategorias

**Data:** 2026-06-16
**Arquivos afetados:** migration nova, `types/index.ts`, `useCategories.ts`, `Categories.tsx`, `Transactions.tsx`, `Reports.tsx`
**Não tocar em:** `useAccounts.ts`, `Accounts.tsx`, `useTransactions.ts`, `Dashboard.tsx`, `Goals.tsx`

---

## Contexto

`categories` não tem `parent_id`. A feature adiciona dois níveis: grupo pai (não selecionável em transações) e subcategoria (selecionável). As 9 categorias existentes viram grupos pai.

Categorias pai que já têm transações vinculadas continuam válidas para exibição, mas não devem ser selecionáveis para novas transações.

---

## Task 1 — Migration

Criar `supabase/migrations/20260616000000_categories_subcategories.sql`:

```sql
-- Adicionar parent_id em categories
ALTER TABLE categories
  ADD COLUMN parent_id uuid REFERENCES categories(id) ON DELETE CASCADE;

-- Subcategorias de Alimentação (ID: 877d8756-...)
-- Verificar o UUID real com: SELECT id, name FROM categories ORDER BY name;
-- Usar os UUIDs reais do banco, não placeholder

INSERT INTO categories (name, icon, color, type, parent_id)
SELECT 'Supermercado',    '🛒', '#f97316', 'expense', id FROM categories WHERE name = 'Alimentação'
UNION ALL
SELECT 'Restaurantes',   '🍽️', '#f97316', 'expense', id FROM categories WHERE name = 'Alimentação'
UNION ALL
SELECT 'Delivery',       '🛵', '#f97316', 'expense', id FROM categories WHERE name = 'Alimentação'
UNION ALL
SELECT 'Padaria / Café', '☕', '#f97316', 'expense', id FROM categories WHERE name = 'Alimentação';

INSERT INTO categories (name, icon, color, type, parent_id)
SELECT 'Salário CLT', '💼', '#22c55e', 'income', id FROM categories WHERE name = 'Salário'
UNION ALL
SELECT 'Freelance',   '💻', '#22c55e', 'income', id FROM categories WHERE name = 'Salário'
UNION ALL
SELECT '13º Salário', '🎄', '#22c55e', 'income', id FROM categories WHERE name = 'Salário'
UNION ALL
SELECT 'Pró-labore',  '🏢', '#22c55e', 'income', id FROM categories WHERE name = 'Salário';

INSERT INTO categories (name, icon, color, type, parent_id)
SELECT 'Aluguel',          '🏠', '#06b6d4', 'expense', id FROM categories WHERE name = 'Moradia'
UNION ALL
SELECT 'Energia Elétrica', '⚡', '#06b6d4', 'expense', id FROM categories WHERE name = 'Moradia'
UNION ALL
SELECT 'Internet',         '📡', '#06b6d4', 'expense', id FROM categories WHERE name = 'Moradia'
UNION ALL
SELECT 'Água e Esgoto',    '💧', '#06b6d4', 'expense', id FROM categories WHERE name = 'Moradia'
UNION ALL
SELECT 'Condomínio',       '🏢', '#06b6d4', 'expense', id FROM categories WHERE name = 'Moradia';

INSERT INTO categories (name, icon, color, type, parent_id)
SELECT 'Combustível',        '⛽', '#8b5cf6', 'expense', id FROM categories WHERE name = 'Transporte'
UNION ALL
SELECT 'Uber / 99',          '🚕', '#8b5cf6', 'expense', id FROM categories WHERE name = 'Transporte'
UNION ALL
SELECT 'Transporte Público', '🚌', '#8b5cf6', 'expense', id FROM categories WHERE name = 'Transporte'
UNION ALL
SELECT 'Estacionamento',     '🅿️', '#8b5cf6', 'expense', id FROM categories WHERE name = 'Transporte'
UNION ALL
SELECT 'Manutenção',         '🔧', '#8b5cf6', 'expense', id FROM categories WHERE name = 'Transporte';

INSERT INTO categories (name, icon, color, type, parent_id)
SELECT 'Plano de Saúde',   '🏥', '#ec4899', 'expense', id FROM categories WHERE name = 'Saúde'
UNION ALL
SELECT 'Farmácia',         '💊', '#ec4899', 'expense', id FROM categories WHERE name = 'Saúde'
UNION ALL
SELECT 'Consultas/Exames', '🩺', '#ec4899', 'expense', id FROM categories WHERE name = 'Saúde'
UNION ALL
SELECT 'Academia',         '💪', '#ec4899', 'expense', id FROM categories WHERE name = 'Saúde';

INSERT INTO categories (name, icon, color, type, parent_id)
SELECT 'Cursos',  '📚', '#3b82f6', 'expense', id FROM categories WHERE name = 'Educação'
UNION ALL
SELECT 'Livros',  '📖', '#3b82f6', 'expense', id FROM categories WHERE name = 'Educação'
UNION ALL
SELECT 'Assinaturas Edu', '🎓', '#3b82f6', 'expense', id FROM categories WHERE name = 'Educação';

INSERT INTO categories (name, icon, color, type, parent_id)
SELECT 'Streaming',   '📺', '#f4d9d0', 'expense', id FROM categories WHERE name = 'Lazer'
UNION ALL
SELECT 'Cinema',      '🎬', '#f4d9d0', 'expense', id FROM categories WHERE name = 'Lazer'
UNION ALL
SELECT 'Viagens',     '✈️', '#f4d9d0', 'expense', id FROM categories WHERE name = 'Lazer'
UNION ALL
SELECT 'Assinaturas', '📱', '#f4d9d0', 'expense', id FROM categories WHERE name = 'Lazer';

INSERT INTO categories (name, icon, color, type, parent_id)
SELECT 'Pix recebido',   '📱', '#22c55e', 'income', id FROM categories WHERE name = 'Pix'
UNION ALL
SELECT 'Pix enviado',    '📤', '#ef4444', 'expense',id FROM categories WHERE name = 'Pix';

INSERT INTO categories (name, icon, color, type, parent_id)
SELECT 'Doações',          '🤝', '#94a3b8', 'expense', id FROM categories WHERE name = 'Outros'
UNION ALL
SELECT 'Presentes',        '🎁', '#94a3b8', 'expense', id FROM categories WHERE name = 'Outros'
UNION ALL
SELECT 'Não Categorizado', '❓', '#94a3b8', 'both',    id FROM categories WHERE name = 'Outros';
```

Aplicar com:
```bash
npx supabase db push
```

Confirmar sucesso antes de prosseguir.

---

## Task 2 — Atualizar `src/types/index.ts`

Atualizar a interface `Category` adicionando `parent_id` e `subcategories`:

```ts
export interface Category {
  id: string
  name: string
  color: string
  icon: string
  type: CategoryType
  parent_id: string | null        // NOVO
  created_at: string
  subcategories?: Category[]      // NOVO — populado no frontend quando necessário
}
```

---

## Task 3 — Atualizar `src/hooks/useCategories.ts`

Manter o `fetchCategories()` atual (lista plana). Adicionar `fetchCategoryTree()`:

```ts
const fetchCategoryTree = useCallback(async (): Promise<Category[]> => {
  const { data, error: err } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  if (err || !data) return []

  const parents = (data as Category[]).filter((c) => c.parent_id === null)
  const children = (data as Category[]).filter((c) => c.parent_id !== null)

  return parents.map((p) => ({
    ...p,
    subcategories: children.filter((c) => c.parent_id === p.id),
  }))
}, [])
```

Adicionar ao retorno do hook: `fetchCategoryTree`.

Não remover nada existente.

---

## Task 4 — Atualizar `src/pages/Categories.tsx`

### Nova estrutura visual

Substituir o grid flat atual por lista agrupada: cada grupo pai como seção com header, subcategorias como cards dentro.

**Dois botões no topo:**
- "Novo grupo" — cria categoria com `parent_id = null`
- "Nova subcategoria" — abre Dialog com Select de grupo pai obrigatório

**Por grupo pai, exibir:**
- Header de seção: emoji + nome do grupo + badge de contagem de subcategorias + botões editar/excluir do grupo
- Cards das subcategorias abaixo

**Regras de exclusão:**
- Grupo pai com subcategorias: bloquear exclusão, exibir alerta "Remova as subcategorias antes de excluir o grupo"
- Subcategoria: excluir diretamente com confirmação simples

**FormState atualizado:**
```ts
interface FormState {
  name: string
  icon: string
  color: string
  type: CategoryType
  parent_id: string | null   // NOVO
}
```

**Dialog de criação/edição:**
- Adicionar campo `parent_id` — Select com "Grupo principal (sem pai)" + lista de grupos pai
- Ao criar subcategoria via botão no grupo, pré-preencher `parent_id`

**fetchCategoryTree:**
Usar `fetchCategoryTree()` para montar a estrutura visual. Para operações de create/update/delete, continuar usando os métodos existentes do hook.

---

## Task 5 — Atualizar Select de categoria em `Transactions.tsx`

**Arquivo:** `src/pages/Transactions.tsx`

O Select de categoria no modal de criação/edição deve usar a estrutura de grupos.

**Importar `fetchCategoryTree` do hook:**
```ts
const { categories, fetchCategoryTree } = useCategories()
const [categoryTree, setCategoryTree] = useState<Category[]>([])

useEffect(() => {
  fetchCategoryTree().then(setCategoryTree)
}, [fetchCategoryTree])
```

**Substituir o Select de categoria por grouped select:**

Como `<Select>` do shadcn/ui não tem suporte nativo a `optgroup`, implementar da seguinte forma:

```tsx
<SelectContent className="bg-[#1a1d27] border-[#2d3148]">
  {categoryTree.map((group) => (
    <div key={group.id}>
      {/* Label do grupo — não selecionável */}
      <div className="px-2 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {group.icon} {group.name}
      </div>
      {/* Subcategorias selecionáveis */}
      {(group.subcategories ?? []).map((sub) => (
        <SelectItem key={sub.id} value={sub.id} className="pl-6">
          {sub.icon} {sub.name}
        </SelectItem>
      ))}
      {/* Compatibilidade legado: se o grupo não tem subcategorias, o próprio grupo é selecionável */}
      {(group.subcategories ?? []).length === 0 && (
        <SelectItem key={group.id} value={group.id} className="pl-4 italic text-slate-400">
          {group.icon} {group.name}
        </SelectItem>
      )}
    </div>
  ))}
</SelectContent>
```

**Filtro de categoria na listagem** também deve usar o mesmo `categoryTree` para consistência visual, mas pode manter o Select flat (com todos em lista) se o grouped causar complexidade extra — deixar a critério do implementador.

---

## Task 6 — Atualizar `src/pages/Reports.tsx`

Adicionar toggle "Por grupo / Por subcategoria" na aba de Resumo.

**Estado:**
```ts
const [groupByParent, setGroupByParent] = useState(false)
```

**Por subcategoria (default, comportamento atual):**
Sem mudança.

**Por grupo (`groupByParent = true`):**
Agrupar os dados da tabela somando todas as subcategorias com mesmo `parent_id`. Exibir o nome do grupo pai (buscar na lista de categorias).

Para categorias legado (sem subcategorias), exibir o próprio nome da categoria.

**UI do toggle:**
Colocar próximo ao seletor de período, usando botões ou Tabs simples:
```tsx
<div className="flex gap-1 rounded-lg border border-[#2d3148] p-0.5">
  <button
    onClick={() => setGroupByParent(false)}
    className={`px-3 py-1 rounded text-xs transition-colors ${!groupByParent ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
  >
    Por subcategoria
  </button>
  <button
    onClick={() => setGroupByParent(true)}
    className={`px-3 py-1 rounded text-xs transition-colors ${groupByParent ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
  >
    Por grupo
  </button>
</div>
```

---

## Checklist

- [ ] Migration criada e aplicada com `npx supabase db push`
- [ ] `Category` em `types/index.ts` tem `parent_id` e `subcategories?`
- [ ] `fetchCategoryTree` adicionado ao `useCategories.ts` e no retorno
- [ ] `Categories.tsx` exibe estrutura pai/filho com headers de grupo
- [ ] Exclusão de grupo pai com filhos está bloqueada com mensagem
- [ ] `Transactions.tsx` usa grouped select no modal de categoria
- [ ] Compatibilidade legado: grupos sem subcategorias ainda são selecionáveis
- [ ] `Reports.tsx` tem toggle "Por grupo / Por subcategoria"
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat: category tree with subcategories and grouped selects"`
- [ ] `git push origin main && npm run deploy`