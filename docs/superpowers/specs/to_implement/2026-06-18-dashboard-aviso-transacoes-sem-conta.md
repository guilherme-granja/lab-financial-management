# SPEC — Aviso de Transações Sem Conta no Dashboard

**Data:** 2026-06-18
**Arquivos afetados:** `src/pages/Dashboard.tsx`
**Não tocar em:** `src/hooks/useAccounts.ts`, `src/hooks/useTransactions.ts`, `src/pages/Accounts.tsx`, qualquer migration ou tipo
**Modelo:** Sonnet padrão
**Paralelismo:** N/A — task única

---

## Contexto

O Dashboard calcula "Saldo do mês" somando transações pagas do mês que tenham `account_id IS NULL` **ou** `account_id` de contas com `include_in_dashboard = true`. Isso faz com que transações sem conta vinculada entrem no total do Dashboard mas não apareçam no saldo de nenhuma conta na página Contas — causando divergência visível para o usuário. Não existe nenhum aviso ou indicação desta situação hoje.

---

## Task 1 — Banner de aviso no Dashboard

**Arquivo:** `src/pages/Dashboard.tsx`
> Review: sim

Dentro da função `load()` já existente, adicionar uma query paralela às demais (incluir no `Promise.all`) que conta transações do mês atual com `account_id IS NULL` e `type != 'transfer'`:

```ts
supabase
  .from('transactions')
  .select('id', { count: 'exact', head: true })
  .gte('date', monthStart)
  .lte('date', monthEnd)
  .neq('type', 'transfer')
  .is('account_id', null)
```

Adicionar estado `const [unlinkedCount, setUnlinkedCount] = useState(0)` no componente.

Após o `Promise.all`, popular `unlinkedCount` com o `count` retornado (default `0` se nulo).

Renderizar o banner **entre os summary cards e os gráficos**, condicionalmente quando `unlinkedCount > 0`:

```tsx
{unlinkedCount > 0 && (
  <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-400">
    <AlertTriangle size={16} className="shrink-0" />
    <span>
      {unlinkedCount === 1
        ? '1 transação deste mês não está vinculada a nenhuma conta e está sendo contabilizada no saldo acima.'
        : `${unlinkedCount} transações deste mês não estão vinculadas a nenhuma conta e estão sendo contabilizadas no saldo acima.`}
    </span>
    <button
      onClick={() => navigate('/transactions?account=none')}
      className="ml-auto shrink-0 underline underline-offset-2 hover:text-yellow-300"
    >
      Ver transações
    </button>
  </div>
)}
```

Importar `AlertTriangle` de `lucide-react` e `useNavigate` de `react-router-dom`.

O botão "Ver transações" navega para `/transactions?account=none`. **Não implementar** o filtro `account=none` em Transactions.tsx nesta spec — o link serve como atalho para revisão futura.

Restrições:
- Não reorganizar nem refatorar o `load()` existente — apenas adicionar a query no `Promise.all` e o estado
- Não alterar os cards de summary, gráficos ou tabela de recentes
- O banner só aparece quando `unlinkedCount > 0`; quando zero, nenhum elemento é renderizado

---

## Checklist

- [ ] Task 1 concluída
- [ ] Banner aparece quando há transações sem conta no mês atual
- [ ] Banner não aparece quando todas as transações têm conta vinculada
- [ ] Clique em "Ver transações" navega para `/transactions?account=none`
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat: aviso de transações sem conta vinculada no Dashboard"`
- [ ] `git push origin main && npm run deploy`
