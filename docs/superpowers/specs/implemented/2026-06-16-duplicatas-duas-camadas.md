# SPEC — Detecção de Transações Duplicadas (duas camadas)

**Data:** 2026-06-16
**Arquivos afetados:**
- `supabase/migrations/20260616190000_duplicate_index.sql` *(novo)*
- `src/hooks/useDuplicateCheck.ts` *(novo)*
- `src/pages/Duplicates.tsx` *(novo)*
- `src/pages/Transactions.tsx`
- `src/router/index.tsx`
- `src/components/layout/Sidebar.tsx`

**Não tocar em:**
- `src/hooks/useTransactions.ts`
- `src/hooks/useCategories.ts`
- `src/components/ui/select.tsx`
- `supabase/migrations/` *(arquivos existentes)*

**Modelo:** Sonnet 4.6 High

---

## Execução via Claude Code (bash)

Toda implementação desta spec deve ser feita pelo **Claude Code via bash**. Nenhum arquivo deve ser criado ou editado manualmente.

### Pré-requisitos — verificar antes de começar

```bash
# Confirmar que está na raiz do projeto
pwd  # deve terminar em /lab-financial-management

# Confirmar que o Supabase CLI está disponível
npx supabase --version

# Confirmar que as variáveis de ambiente do Supabase estão configuradas
cat .env | grep SUPABASE
```

### Ordem de execução obrigatória

As tasks têm dependência sequencial. Executar nesta ordem e **não avançar para a próxima task se a atual retornar erro**.

**Task 1 — Migration (deve ser a primeira)**
```bash
# 1. Criar o arquivo de migration
cat > supabase/migrations/20260616190000_duplicate_index.sql << 'EOF'
-- conteúdo da Task 1
EOF

# 2. Aplicar no banco remoto
npx supabase db push

# 3. Verificar que não houve erro no output do push antes de continuar
```

**Tasks 2, 3, 4, 5 — Código fonte**
```bash
# Criar/editar os arquivos com o editor do Claude Code
# Após todas as alterações, verificar tipos:
npx tsc --noEmit

# Só avançar para deploy se tsc retornar exit code 0 (zero erros)
echo "tsc exit code: $?"
```

**Deploy final**
```bash
# Apenas após tsc sem erros
git add -A
git commit -m "feat: detecção de duplicatas em duas camadas"
git push origin main
npm run deploy
```

### Comandos de verificação pós-deploy
```bash
# Confirmar que o build foi gerado sem erros
npm run build 2>&1 | tail -5

# Confirmar que o índice existe no Supabase (requer supabase CLI autenticado)
npx supabase db diff --schema public 2>/dev/null | grep idx_transactions_duplicate_check || echo "Verificar manualmente no Dashboard > Database > Indexes"
```

---

## Contexto e Arquitetura

### Por que índice composto e não cache/tabela auxiliar

Com menos de 500 transações por mês, o problema de performance **não é volume** — é fazer queries sem índice. Um full scan numa tabela sem índice em campos de texto/numérico é lento mesmo com 300 registros. Um índice composto em `(type, amount, date, description)` transforma qualquer busca de duplicata numa lookup por chave: O(log n) em vez de O(n).

Isso elimina a necessidade de:
- Cache client-side (complexidade de invalidação)
- Tabela auxiliar (complexidade de sync, dois writes por transação)
- Endpoint GraphQL (overhead desnecessário para esse volume)

### Definição de duplicata

Duas transações são duplicatas se compartilham **os quatro campos simultaneamente dentro do mesmo mês**:
- `type` — mesmo tipo (receita/despesa/transferência)
- `amount` — mesmo valor exato
- `date` — mesma data
- `description` — mesma descrição (case-insensitive, null ≠ null — dois nulls não são duplicatas)

A restrição **por mês** é intencional: uma conta de luz de R$ 150,00 todo mês não é duplicata — são transações legítimas em datas diferentes.

### As duas camadas

**Camada 1 — Prevenção:** no modal de criação (`handleSave`), antes de salvar, o front consulta o banco via `useDuplicateCheck`. Se encontrar match exato, exibe alerta não-bloqueante com os dados do possível duplicado. O usuário decide se continua ou cancela.

**Camada 2 — Revisão:** página `/duplicates` que ao ser acessada faz uma única query agrupada buscando todos os grupos de duplicatas no banco. Não roda em background. O usuário resolve manualmente.

---

## Task 1 — Migration: índice composto

**Arquivo:** `supabase/migrations/20260616190000_duplicate_index.sql` *(criar)*
> Review: não

Criar o arquivo via bash e aplicar com `npx supabase db push`. **Esta task bloqueia todas as demais — não prosseguir se o push retornar erro.**

```bash
# Claude Code deve executar via bash:
npx supabase db push
# Verificar output — deve finalizar sem erros antes de continuar
```

```sql
-- Índice composto para detecção eficiente de duplicatas.
-- Cobre buscas por (type, amount, date, description) sem full scan.
-- Partial index: exclui linhas com description NULL pois dois NULLs não são duplicatas.
CREATE INDEX IF NOT EXISTS idx_transactions_duplicate_check
  ON transactions (type, amount, date, description)
  WHERE description IS NOT NULL;
```

**Por que partial index (`WHERE description IS NOT NULL`):** transações sem descrição com mesmo tipo/valor/data são ambíguas demais para classificar como duplicatas (ex: duas despesas de R$ 50 no mesmo dia sem descrição podem ser compras legítimas diferentes). O índice cobre apenas os casos onde a descrição existe e é identificável.

---

## Task 2 — Hook useDuplicateCheck

**Arquivo:** `src/hooks/useDuplicateCheck.ts` *(criar)*
> Review: não

Hook com duas funções exportadas. Não manter estado interno — funções puras que retornam Promises, chamadas sob demanda.

```ts
import { supabase } from '@/lib/supabase'
import type { Transaction } from '@/types'
import { startOfMonth, endOfMonth, format } from 'date-fns'

// Camada 1: verifica se já existe transação com os mesmos 4 campos no mesmo mês.
// Retorna a transação duplicada encontrada ou null.
export async function checkDuplicate(params: {
  type: string
  amount: number
  date: string        // 'yyyy-MM-dd'
  description: string
  excludeId?: string  // ao editar, excluir a própria transação da busca
}): Promise<Transaction | null> {
  if (!params.description?.trim()) return null // sem descrição: nunca duplicata

  const ref = new Date(params.date)
  const dateStart = format(startOfMonth(ref), 'yyyy-MM-dd')
  const dateEnd   = format(endOfMonth(ref),   'yyyy-MM-dd')

  let query = supabase
    .from('transactions')
    .select('*, categories(*), accounts!account_id(*)')
    .eq('type', params.type)
    .eq('amount', params.amount)
    .eq('date', params.date)
    .ilike('description', params.description.trim())  // case-insensitive
    .gte('date', dateStart)
    .lte('date', dateEnd)
    .limit(1)

  if (params.excludeId) {
    query = query.neq('id', params.excludeId)
  }

  const { data } = await query
  return data?.[0] ?? null
}

// Camada 2: busca todos os grupos de duplicatas no banco.
// Retorna grupos com 2+ transações idênticas (type+amount+date+description).
// Agrupamento feito no client para evitar RPC/stored procedure.
export async function fetchAllDuplicateGroups(): Promise<Transaction[][]> {
  // Busca apenas transações com descrição (sem descrição nunca são duplicatas)
  const { data, error } = await supabase
    .from('transactions')
    .select('*, categories(*), accounts!account_id(*)')
    .not('description', 'is', null)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  if (!data?.length) return []

  // Agrupa por chave composta no client
  const map = new Map<string, Transaction[]>()
  for (const tx of data as Transaction[]) {
    const key = `${tx.type}|${tx.amount}|${tx.date}|${tx.description?.toLowerCase().trim()}`
    const group = map.get(key) ?? []
    group.push(tx)
    map.set(key, group)
  }

  // Retorna apenas grupos com 2+ transações
  return Array.from(map.values()).filter((g) => g.length >= 2)
}

export function useDuplicateCheck() {
  return { checkDuplicate, fetchAllDuplicateGroups }
}
```

**Nota sobre `fetchAllDuplicateGroups`:** o agrupamento por chave composta é feito no client (JS) em vez de no banco. Isso evita usar `GROUP BY` + RPC/stored procedure no Supabase (que exigiria configuração extra). Com ≤ 500 tx/mês e anos de histórico (digamos 6.000 registros totais), o agrupamento em JS é instantâneo. O índice ainda é usado pelo Supabase internamente na busca base.

---

## Task 3 — Página Duplicates

**Arquivo:** `src/pages/Duplicates.tsx` *(criar)*
> Review: sim

Página que ao ser montada busca todos os grupos de duplicatas e os exibe para resolução. Sem polling, sem refresh automático — o usuário recarrega manualmente se quiser.

### Estados

```ts
const [groups, setGroups] = useState<Transaction[][]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)
const [resolving, setResolving] = useState<string | null>(null) // id da tx sendo deletada
```

### Fetch no mount

```ts
useEffect(() => {
  async function load() {
    setLoading(true)
    try {
      const result = await fetchAllDuplicateGroups()
      setGroups(result)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }
  load()
}, [])
```

### Função de resolver duplicata

```ts
async function resolveDuplicate(groupKey: string, keepId: string, removeId: string) {
  setResolving(removeId)
  try {
    const { error } = await supabase.from('transactions').delete().eq('id', removeId)
    if (error) throw new Error(error.message)
    // Remove do grupo ou remove o grupo se sobrou só 1
    setGroups((prev) =>
      prev
        .map((g) => g.filter((tx) => tx.id !== removeId))
        .filter((g) => g.length >= 2)
    )
  } catch (e) {
    setError((e as Error).message)
  } finally {
    setResolving(null)
  }
}
```

### Layout da página

Header com título "Transações Duplicadas" e badge com quantidade de grupos encontrados.

**Estado de loading:** spinner centralizado.

**Estado vazio (sem duplicatas):** ícone `CheckCircle2` verde + mensagem "Nenhuma duplicata encontrada. Sua base está limpa!" em card centralizado.

**Estado de erro:** mensagem de erro em vermelho.

**Lista de grupos:** cada grupo renderizado como card (`bg-[#1a1d27] border-[#2d3148] rounded-xl`):

- Header do card: badge com número de duplicatas (ex: "2 duplicatas") + rótulo do tipo (Receita/Despesa/Transferência) + valor formatado + data + descrição. Isso identifica o grupo.
- Tabela interna com as transações do grupo — colunas: **Conta**, **Categoria**, **Data de criação** (`created_at`), **Ações**.
- A coluna Ações tem um único botão por linha: **"Manter esta / Remover as outras"** → chama `resolveDuplicate` passando o `id` desta como `keepId` e deletando todas as outras do grupo em sequência.

```tsx
// Botão de resolver: mantém a transação clicada, remove as demais do grupo
<Button
  size="sm"
  variant="ghost"
  disabled={!!resolving}
  className="text-xs text-indigo-400 hover:text-indigo-200 gap-1.5"
  onClick={() => {
    const others = group.filter((tx) => tx.id !== current.id)
    // Deleta as outras em sequência
    for (const other of others) {
      resolveDuplicate(groupKey, current.id, other.id)
    }
  }}
>
  <Trash2 size={12} />
  {resolving && others.some(o => o.id === resolving) ? 'Removendo...' : 'Manter esta'}
</Button>
```

**Rodapé da página:** botão "Atualizar" (ícone `RefreshCw`) que re-executa o fetch.

---

## Task 4 — Camada 1: alerta de duplicata no modal de Transactions

**Arquivo:** `src/pages/Transactions.tsx`
> Review: sim

### Novo estado

```ts
const [duplicateWarning, setDuplicateWarning] = useState<Transaction | null>(null)
```

### Modificação no `handleSave`

Adicionar verificação **após as validações existentes e antes do `setSaving(true)`**:

```ts
async function handleSave() {
  // ... validações existentes ...

  // Verificação de duplicata (apenas em criações, não em edições)
  // Em edição, excluir a própria transação da busca via excludeId
  const amount = parseFloat(form.amount)
  if (form.description?.trim() && !isNaN(amount)) {
    const duplicate = await checkDuplicate({
      type: form.type,
      amount,
      date: form.date,
      description: form.description,
      excludeId: editingId ?? undefined,
    })
    if (duplicate && !duplicateWarning) {
      // Primeira detecção: exibe aviso e para aqui.
      // Se o usuário clicar em Salvar novamente, duplicateWarning já está setado
      // e a verificação é pulada (lógica do !duplicateWarning acima).
      setDuplicateWarning(duplicate)
      return
    }
  }

  // Limpa aviso se passou pela segunda tentativa
  setDuplicateWarning(null)
  setSaving(true)
  // ... resto do handleSave inalterado ...
}
```

**Lógica de "duplo clique para forçar":** na primeira tentativa com duplicata, `setDuplicateWarning` é chamado e o save é interrompido. O usuário vê o aviso no modal. Se clicar em Salvar novamente, `duplicateWarning` já não é `null`, então `!duplicateWarning` é `false` e a verificação é pulada — o save prossegue normalmente. Isso elimina a necessidade de um botão "Forçar salvar" extra.

Limpar `duplicateWarning` ao abrir/fechar o dialog:
```ts
function openCreate() {
  setDuplicateWarning(null)
  // ... resto inalterado
}
function openEdit(tx: Transaction) {
  setDuplicateWarning(null)
  // ... resto inalterado
}
// No onOpenChange do Dialog:
onOpenChange={(open) => { if (!open) setDuplicateWarning(null); setDialogOpen(open) }}
```

### JSX do aviso no modal

Inserir **dentro do dialog**, após o bloco `{formError && ...}` e antes dos campos do form:

```tsx
{duplicateWarning && (
  <div className="flex items-start gap-3 bg-yellow-950/40 border border-yellow-800 rounded-lg p-3">
    <AlertTriangle className="text-yellow-400 mt-0.5 flex-shrink-0" size={16} />
    <div className="space-y-1">
      <p className="text-yellow-200 text-sm font-medium">Possível transação duplicada</p>
      <p className="text-yellow-300/80 text-xs">
        Já existe uma transação com esses dados em{' '}
        <span className="font-semibold">{formatDate(duplicateWarning.date)}</span>
        {duplicateWarning.description && ` — "${duplicateWarning.description}"`}
        {' '}no valor de{' '}
        <span className="font-semibold">{formatCurrency(duplicateWarning.amount)}</span>.
      </p>
      <p className="text-yellow-400/70 text-xs">
        Clique em <span className="font-semibold">Salvar</span> novamente para confirmar mesmo assim.
      </p>
    </div>
  </div>
)}
```

### Importações necessárias

```tsx
import { AlertTriangle } from 'lucide-react'
import { checkDuplicate } from '@/hooks/useDuplicateCheck'
```

---

## Task 5 — Rota e Sidebar

**Arquivos:** `src/router/index.tsx` e `src/components/layout/Sidebar.tsx`
> Review: não

### router/index.tsx

```tsx
import Duplicates from '@/pages/Duplicates'

// Adicionar em children:
{ path: '/duplicates', element: <Duplicates /> },
```

### Sidebar.tsx

Adicionar item após "Transações":

```tsx
import { Copy } from 'lucide-react' // ícone de duplicidade

// Em navItems:
{ to: '/duplicates', label: 'Duplicidades', icon: Copy },
```

Posição sugerida: logo abaixo de "Transações" (`/transactions`), pois é uma funcionalidade de gestão de transações.

---

## Orientações de configuração no Supabase

A única configuração necessária é aplicar a migration com o índice. Nenhum endpoint extra, RPC, função ou GraphQL é necessário.

**Passos:**
1. Criar o arquivo `supabase/migrations/20260616190000_duplicate_index.sql` com o conteúdo da Task 1.
2. Rodar `npx supabase db push` no terminal — isso aplica a migration no banco remoto.
3. Para confirmar que o índice foi criado, acessar o **Supabase Dashboard → Database → Indexes** e procurar por `idx_transactions_duplicate_check`.

Nenhuma outra configuração no Supabase é necessária.

---

## Checklist

- [ ] Task 1 concluída — migration aplicada com `npx supabase db push`; índice visível no Dashboard do Supabase
- [ ] Task 2 concluída — `useDuplicateCheck.ts` criado com `checkDuplicate` e `fetchAllDuplicateGroups`
- [ ] Task 3 concluída — página `Duplicates.tsx` funcionando
  - [ ] Loading state com spinner
  - [ ] Empty state com `CheckCircle2` verde
  - [ ] Lista de grupos com botão "Manter esta"
  - [ ] Botão "Atualizar" re-executa o fetch
- [ ] Task 4 concluída — alerta de duplicata no modal de Transactions
  - [ ] Primeira tentativa de salvar com duplicata: exibe aviso, não salva
  - [ ] Segunda tentativa: salva sem verificar novamente
  - [ ] Abrir/fechar dialog limpa o aviso
- [ ] Task 5 concluída — rota `/duplicates` e item "Duplicidades" no Sidebar
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat: detecção de duplicatas em duas camadas"`
- [ ] `git push origin main && npm run deploy`

### Comandos bash do checklist (Claude Code executa via terminal)

```bash
# Verificar tipos após todas as alterações de código
npx tsc --noEmit

# Deploy — só executar se tsc retornar sem erros
git add -A
git commit -m "feat: detecção de duplicatas em duas camadas"
git push origin main
npm run deploy

# Confirmar índice no Supabase
npx supabase db diff --schema public 2>/dev/null | grep idx_transactions_duplicate_check \
  || echo "Verificar manualmente: Dashboard > Database > Indexes > idx_transactions_duplicate_check"
```