# SPEC — Exclusão segura de Categoria / Subcategoria

**Data:** 2026-06-16
**Arquivos afetados:**
- `src/hooks/useCategories.ts`
- `src/pages/Categories.tsx`

**Não tocar em:**
- `src/hooks/useTransactions.ts`
- `src/pages/Transactions.tsx`
- `src/components/ui/select.tsx`
- `src/types/index.ts`

**Modelo:** Sonnet 4.6 High

---

## Contexto

O fluxo de exclusão de categoria hoje deleta diretamente sem qualquer validação. Se a categoria estiver vinculada a transações, as transações ficam com `category_id = null` silenciosamente. O novo fluxo deve verificar o uso antes de deletar e, se houver transações vinculadas, guiar o usuário por um processo de transferência de categoria antes da exclusão.

A regra se aplica tanto a **grupos** (categorias pai) quanto a **subcategorias** — a verificação é sempre sobre a categoria sendo deletada. A regra existente de "remova subcategorias antes de excluir o grupo" é mantida inalterada e ocorre antes de qualquer nova verificação.

---

## Fluxo completo do Delete Dialog

O dialog atual tem apenas um estágio (confirmar). Ele será substituído por um dialog com **3 estágios** controlados por estado:

```
'checking'  → spinner enquanto consulta o banco
'confirm'   → sem transações: confirmação simples
'warn'      → com transações: alerta com contagem + Cancelar / Continuar
'transfer'  → seleção da categoria de destino + botão Transferir e excluir
```

---

## Task 1 — Hook: checkCategoryUsage + deleteCategoryWithTransfer

**Arquivo:** `src/hooks/useCategories.ts`
> Review: não

Adicionar duas funções ao hook. Não alterar `deleteCategory` existente (ainda é usada internamente).

### `checkCategoryUsage(id: string): Promise<number>`

Conta quantas transações têm `category_id` igual ao `id` informado:

```ts
const checkCategoryUsage = async (id: string): Promise<number> => {
  const { count, error } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('category_id', id)
  if (error) throw new Error(error.message)
  return count ?? 0
}
```

### `deleteCategoryWithTransfer(id: string, targetCategoryId: string): Promise<void>`

Em sequência (sem transação de banco — dois calls simples):
1. Atualiza todas as transações com `category_id = id` para `category_id = targetCategoryId`
2. Deleta a categoria `id`

```ts
const deleteCategoryWithTransfer = async (id: string, targetCategoryId: string): Promise<void> => {
  const { error: updateErr } = await supabase
    .from('transactions')
    .update({ category_id: targetCategoryId })
    .eq('category_id', id)
  if (updateErr) throw new Error(updateErr.message)
  await deleteCategory(id)
}
```

Expor ambas no retorno do hook.

---

## Task 2 — Categories.tsx: novo fluxo de delete em 3 estágios

**Arquivo:** `src/pages/Categories.tsx`
> Review: sim

### Novos estados

Adicionar ao componente:

```ts
type DeleteStage = 'checking' | 'confirm' | 'warn' | 'transfer'

const [deleteStage, setDeleteStage] = useState<DeleteStage>('checking')
const [deleteCount, setDeleteCount] = useState(0)
const [transferTargetId, setTransferTargetId] = useState('')
const [transferring, setTransferring] = useState(false)
const [deleteError, setDeleteError] = useState<string | null>(null)
```

Manter `deleteId` e `deletingCategory` (objeto `Category | null`) para ter o nome disponível no dialog. Adicionar `deletingCategory` ao estado para exibir o nome da categoria sendo excluída.

### Função `requestDelete` atualizada

Substituir a `requestDelete` atual:

```ts
async function requestDelete(cat: Category, isParent: boolean) {
  // Regra existente: grupo com filhos não pode ser deletado
  if (isParent && (cat.subcategories?.length ?? 0) > 0) {
    setDeleteError('Remova as subcategorias antes de excluir o grupo.')
    return
  }

  // Abre dialog em estado 'checking'
  setDeleteId(cat.id)
  setDeletingCategory(cat)
  setDeleteStage('checking')
  setDeleteError(null)
  setTransferTargetId('')

  try {
    const count = await checkCategoryUsage(cat.id)
    setDeleteCount(count)
    setDeleteStage(count === 0 ? 'confirm' : 'warn')
  } catch (e) {
    setDeleteError((e as Error).message)
    setDeleteStage('confirm') // fallback seguro
  }
}
```

### Função `handleDelete` atualizada

```ts
async function handleDelete() {
  if (!deleteId) return
  try {
    await deleteCategory(deleteId)
  } catch (e) {
    setDeleteError((e as Error).message)
  } finally {
    closeDeleteDialog()
  }
}
```

### Nova função `handleTransferAndDelete`

```ts
async function handleTransferAndDelete() {
  if (!deleteId || !transferTargetId) return
  setTransferring(true)
  setDeleteError(null)
  try {
    await deleteCategoryWithTransfer(deleteId, transferTargetId)
    closeDeleteDialog()
  } catch (e) {
    setDeleteError((e as Error).message)
  } finally {
    setTransferring(false)
  }
}
```

### Helper `closeDeleteDialog`

```ts
function closeDeleteDialog() {
  setDeleteId(null)
  setDeletingCategory(null)
  setDeleteStage('checking')
  setDeleteCount(0)
  setTransferTargetId('')
  setDeleteError(null)
}
```

### Delete Dialog — substituir o dialog atual pelos 3 estágios

Manter o `<Dialog open={!!deleteId} onOpenChange={closeDeleteDialog}>` como container. O conteúdo interno muda conforme `deleteStage`:

---

**Estágio `checking`** — spinner centralizado, sem botões de ação:

```tsx
<DialogHeader>
  <DialogTitle>Verificando uso...</DialogTitle>
</DialogHeader>
<div className="flex items-center justify-center py-8">
  <Loader2 className="animate-spin text-slate-400" size={28} />
</div>
```

---

**Estágio `confirm`** — sem transações vinculadas, confirmação simples:

```tsx
<DialogHeader>
  <DialogTitle>Excluir categoria</DialogTitle>
</DialogHeader>
<p className="text-slate-400 text-sm">
  Tem certeza que deseja excluir <span className="text-slate-200 font-medium">
  {deletingCategory?.icon} {deletingCategory?.name}</span>? Essa ação não pode ser desfeita.
</p>
{deleteError && <p className="text-red-400 text-sm">{deleteError}</p>}
<DialogFooter>
  <Button variant="ghost" onClick={closeDeleteDialog} className="text-slate-400">Cancelar</Button>
  <Button onClick={handleDelete} className="bg-red-700 hover:bg-red-800 text-white">Excluir</Button>
</DialogFooter>
```

---

**Estágio `warn`** — transações vinculadas, alerta com contagem:

```tsx
<DialogHeader>
  <DialogTitle>Categoria em uso</DialogTitle>
</DialogHeader>
<div className="space-y-3">
  <div className="flex items-start gap-3 bg-yellow-950/40 border border-yellow-800 rounded-lg p-3">
    <AlertTriangle className="text-yellow-400 mt-0.5 flex-shrink-0" size={18} />
    <p className="text-yellow-200 text-sm">
      A categoria <span className="font-semibold">{deletingCategory?.icon} {deletingCategory?.name}</span> está
      vinculada a <span className="font-semibold">{deleteCount} {deleteCount === 1 ? 'transação' : 'transações'}</span>.
      Para excluí-la, você precisa transferir essas transações para outra categoria.
    </p>
  </div>
</div>
{deleteError && <p className="text-red-400 text-sm">{deleteError}</p>}
<DialogFooter>
  <Button variant="ghost" onClick={closeDeleteDialog} className="text-slate-400">Cancelar</Button>
  <Button
    onClick={() => setDeleteStage('transfer')}
    className="bg-yellow-600 hover:bg-yellow-700 text-white"
  >
    Continuar
  </Button>
</DialogFooter>
```

---

**Estágio `transfer`** — seleção da categoria de destino:

O select de destino deve listar apenas categorias **do mesmo tipo** da categoria sendo excluída (ex: se for `expense`, mostrar apenas categorias `expense` ou `both`), excluindo a própria categoria sendo deletada.

```tsx
<DialogHeader>
  <DialogTitle>Transferir transações</DialogTitle>
</DialogHeader>
<div className="space-y-4">
  <p className="text-slate-400 text-sm">
    Selecione a categoria para onde as <span className="text-slate-200 font-medium">
    {deleteCount} {deleteCount === 1 ? 'transação' : 'transações'}</span> serão transferidas
    antes da exclusão de <span className="text-slate-200 font-medium">
    {deletingCategory?.icon} {deletingCategory?.name}</span>.
  </p>
  <div className="space-y-1">
    <Label className="text-slate-400 text-xs">Categoria de destino</Label>
    <Select value={transferTargetId} onValueChange={setTransferTargetId}>
      <SelectTrigger className="bg-[#0f1117] border-[#2d3148]">
        <SelectValue placeholder="Selecionar categoria" />
      </SelectTrigger>
      <SelectContent className="bg-[#1a1d27] border-[#2d3148] max-h-60 overflow-y-auto">
        {categories
          .filter((c) =>
            c.id !== deleteId &&
            (c.type === deletingCategory?.type || c.type === 'both' || deletingCategory?.type === 'both')
          )
          .map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.icon} {c.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  </div>
  {deleteError && <p className="text-red-400 text-sm">{deleteError}</p>}
</div>
<DialogFooter>
  <Button variant="ghost" onClick={() => setDeleteStage('warn')} className="text-slate-400">
    Voltar
  </Button>
  <Button
    onClick={handleTransferAndDelete}
    disabled={!transferTargetId || transferring}
    className="bg-red-700 hover:bg-red-800 text-white"
  >
    {transferring ? 'Transferindo...' : 'Transferir e excluir'}
  </Button>
</DialogFooter>
```

### Importações necessárias

Adicionar ao topo do arquivo:
```tsx
import { AlertTriangle, Loader2 } from 'lucide-react'
```

E desestruturar do hook:
```tsx
const { ..., checkCategoryUsage, deleteCategoryWithTransfer } = useCategories()
```

---

## Checklist

- [ ] Task 1 concluída — `checkCategoryUsage` e `deleteCategoryWithTransfer` adicionados e exportados no hook
- [ ] Task 2 concluída — dialog de 3 estágios funcionando em `Categories.tsx`
  - [ ] Estágio `checking`: aparece enquanto consulta o banco
  - [ ] Estágio `confirm`: exibido quando `count === 0`; deleta sem reusar transações
  - [ ] Estágio `warn`: exibe contagem correta; botão "Cancelar" fecha, "Continuar" avança
  - [ ] Estágio `transfer`: select filtrado por tipo; botão desabilitado sem seleção; "Voltar" retorna para `warn`
- [ ] Testar: deletar categoria sem transações → exclui direto
- [ ] Testar: deletar categoria com transações → alerta → transferir → categoria excluída, transações migradas
- [ ] Testar: deletar grupo com subcategorias → bloqueio permanece inalterado
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat: exclusão segura de categoria com transferência de transações"`
- [ ] `git push origin main && npm run deploy`