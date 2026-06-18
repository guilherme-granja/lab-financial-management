# SPEC — Transactions: Filtros Compactos + Responsividade Mobile

**Data:** 2026-06-18
**Arquivos afetados:** `src/pages/Transactions.tsx`
**Não tocar em:** `src/hooks/useTransactions.ts` · `src/hooks/useCategories.ts` · `src/hooks/useAccounts.ts` · `src/hooks/useTags.ts` · `src/components/ui/*` · qualquer Dialog ou lógica de formulário dentro de `Transactions.tsx`
**Modelo:** Sonnet 4.6 High

---

## Contexto

A barra de filtros atual (`div.flex.flex-wrap.gap-3.items-end` na linha ~438) exibe 6 selects sempre visíveis, ocupando ~80px de altura e transbordando em telas menores. Em mobile, a tabela fica ilegível porque as colunas não cabem na viewport. Não existe nenhuma view alternativa para mobile — a tabela é renderizada igual em qualquer largura.

---

## Task 1 — Filtros compactos no desktop

**Arquivo:** `src/pages/Transactions.tsx`
> Review: sim

Substituir o bloco `{/* Filters */}` (linha ~437 até o fechamento do `</div>` que engloba todos os selects, incluindo o botão "Nova transação", linha ~644) por uma nova barra de filtros com dois níveis:

**Nível 1 — sempre visível (uma linha):**
- Seletor de período (manter JSX atual do período, sem alteração)
- Separador visual (`<div>` com `w-px h-5 bg-[#2d3148]`)
- Pill buttons para Tipo: "Todos" / "Receita" / "Despesa" / "Transferência" — cada pill é um `<button>` que chama `setFilters(f => ({ ...f, type: v }))`. O pill ativo recebe `bg-indigo-600 text-white`, os inativos recebem estilo ghost com border.
- Botão "Filtros" com badge de contador: `<button>` que abre/fecha um painel dropdown. O badge (círculo roxo) exibe `hasSecondaryFilters` — contagem de quantos dos 4 filtros secundários estão ativos (status, categoryId, account_id, tagId diferentes de seus valores padrão).
- Botão "Colunas" — manter comportamento atual do column picker, apenas reposicioná-lo aqui.
- Botão "Nova transação" — manter JSX e onClick atuais, empurrado para `ml-auto`.

Adicionar estado local:
```ts
const [filterPanelOpen, setFilterPanelOpen] = useState(false)
```

Calcular o contador de filtros secundários ativos:
```ts
const secondaryFilterCount =
  (filters.status !== 'all' ? 1 : 0) +
  (filters.categoryId !== 'all' ? 1 : 0) +
  (filters.account_id !== null ? 1 : 0) +
  (filters.tagId !== 'all' ? 1 : 0)
```

**Nível 2 — painel dropdown (condicional):**
Renderizar abaixo da barra quando `filterPanelOpen === true`, como um `<div>` posicionado normalmente no fluxo (não absolute/fixed — evitar conflito com portal do Radix). Conteúdo: grid 2×2 com os 4 selects secundários (Status, Categoria, Tag, Conta) — manter o JSX atual de cada Select integralmente, incluindo as opções. Adicionar um overlay `fixed inset-0 z-10` para fechar ao clicar fora, mesmo padrão do column picker existente na linha ~600.

**Chips de filtros ativos:**
Manter o bloco `{/* Active Filter Chips */}` existente sem alteração — ele já funciona e já renderiza condicionalmente.

Restrições:
- Não alterar nenhum `setFilters`, `filters.*`, `activeChips`, `hasActiveFilters` ou lógica derivada
- Não alterar o column picker além de movê-lo para a nova barra
- Não alterar nada abaixo do bloco de filtros (Total, Table, Pagination, Dialogs)

---

## Task 2 — View mobile com cards

**Arquivo:** `src/pages/Transactions.tsx`
> Review: sim

Adicionar uma view alternativa para mobile que substitui a tabela em telas pequenas. A tabela continua existindo e sendo renderizada em desktop.

Localizar o bloco `{/* Table */}` (linha ~695, o `{(() => { ... })()}` que contém `<div className="bg-[#1a1d27] border ..."><Table>...</Table></div>`).

Envolver o bloco de tabela existente com `<div className="hidden md:block">` para ocultá-lo em mobile.

Logo antes desse wrapper, adicionar o bloco de cards para mobile:

```tsx
{/* Mobile cards */}
<div className="flex flex-col gap-2 md:hidden">
  {loading && (
    <div className="text-center text-slate-500 py-8 text-sm">Carregando...</div>
  )}
  {!loading && transactions.length === 0 && (
    <div className="text-center text-slate-500 py-8 text-sm">Nenhuma transação encontrada</div>
  )}
  {transactions.map((tx) => {
    const toAccount = tx.type === 'transfer' && tx.to_account_id
      ? (accounts.find((a) => a.id === tx.to_account_id) ?? null)
      : null
    return (
      <div
        key={tx.id}
        className="bg-[#1a1d27] border border-[#2d3148] rounded-xl px-4 py-3 flex items-center gap-3"
      >
        {/* Ícone da categoria */}
        <div className="text-xl w-8 text-center shrink-0">
          {tx.type === 'transfer' ? '↔' : tx.categories?.icon ?? '•'}
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="text-slate-200 text-sm font-medium truncate">
            {tx.type === 'transfer'
              ? `${tx.accounts?.name ?? '—'} → ${toAccount?.name ?? '—'}`
              : tx.categories?.name ?? tx.description ?? '—'}
          </div>
          <div className="text-slate-500 text-xs mt-0.5 flex items-center gap-1.5">
            <span>{formatDate(tx.date)}</span>
            {tx.accounts && (
              <>
                <span>·</span>
                <span>{tx.accounts.icon} {tx.accounts.name}</span>
              </>
            )}
            {!tx.paid && tx.type !== 'transfer' && (
              <>
                <span>·</span>
                <span className="text-yellow-500">Pendente</span>
              </>
            )}
          </div>
        </div>

        {/* Valor */}
        <div className={`text-sm font-semibold tabular-nums shrink-0 ${amountColor(tx.type)}`}>
          {amountPrefix(tx.type)}{formatCurrency(tx.amount)}
        </div>

        {/* Ações */}
        <div className="flex gap-0.5 shrink-0">
          {!tx.paid && tx.type !== 'transfer' && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-yellow-400 hover:text-yellow-300"
              onClick={() => openPay(tx)}>
              <CreditCard size={14} />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-200"
            onClick={() => openEdit(tx)}>
            <Pencil size={14} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-400"
            onClick={() => {
              if (tx.recurrence_group_id) {
                setDeleteTx(tx)
                setDeleteScope('only')
              } else {
                setDeleteId(tx.id)
              }
            }}>
            <Trash2 size={14} />
          </Button>
        </div>
      </div>
    )
  })}
</div>
```

Usar as funções `amountColor`, `amountPrefix`, `formatDate`, `formatCurrency` já existentes no arquivo. Não duplicar nenhuma lógica.

Restrições:
- Não alterar a tabela desktop — apenas envolvê-la no wrapper `hidden md:block`
- Não alterar Pagination, Dialogs ou qualquer outra parte do arquivo
- Os botões de ação do card devem ter comportamento idêntico aos da tabela

---

## Checklist

- [ ] Task 1 concluída
- [ ] Task 2 concluída
- [ ] `tsc --noEmit` — zero erros
- [ ] Verificar desktop: barra com pills de tipo + botão Filtros + dropdown funcionando
- [ ] Verificar mobile (DevTools < 768px): cards visíveis, tabela oculta, filtros funcionando
- [ ] Verificar chips de filtros ativos continuam aparecendo corretamente
- [ ] `git commit -m "feat: filtros compactos e view mobile com cards em Transactions"`
- [ ] `git push origin main && npm run deploy`
