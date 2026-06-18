# SPEC — Fix: Transferências não afetam saldo das contas

**Data:** 2026-06-16
**Arquivos afetados:** `src/hooks/useAccounts.ts`
**Não tocar em:** `src/pages/Accounts.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Transactions.tsx`, `src/types/index.ts`
**Modelo:** Sonnet padrão

---

## Contexto

`getAccountBalance` em `useAccounts.ts` calcula o saldo de uma conta buscando apenas transações do tipo `income` e `expense` (`.in('type', ['income', 'expense'])`), ignorando completamente transferências. Isso faz com que o saldo exibido na página de Contas não reflita valores enviados ou recebidos via transferência. O Dashboard já exclui transferências corretamente com `.neq('type', 'transfer')` — o problema é isolado ao cálculo de saldo da conta.

---

## Task 1 — Corrigir `getAccountBalance` para incluir transferências

**Arquivo:** `src/hooks/useAccounts.ts`
> Review: não

Substituir a implementação atual de `getAccountBalance` (linhas ~53–64) pela lógica abaixo. A função deve fazer **duas queries separadas** para calcular o impacto das transferências:

1. Query existente (sem mudança de assinatura): busca `income` e `expense` onde `account_id = id`
2. Query nova — transferências de saída: busca `type = 'transfer'` e `account_id = id` e `paid = true` → deduz do saldo
3. Query nova — transferências de entrada: busca `type = 'transfer'` e `to_account_id = id` e `paid = true` → soma ao saldo

```ts
async function getAccountBalance(id: string, initialBalance: number): Promise<number> {
  const [txRes, transferOutRes, transferInRes] = await Promise.all([
    supabase
      .from('transactions')
      .select('amount, type')
      .eq('account_id', id)
      .eq('paid', true)
      .in('type', ['income', 'expense']),

    supabase
      .from('transactions')
      .select('amount')
      .eq('account_id', id)
      .eq('type', 'transfer')
      .eq('paid', true),

    supabase
      .from('transactions')
      .select('amount')
      .eq('to_account_id', id)
      .eq('type', 'transfer')
      .eq('paid', true),
  ])

  const data = txRes.data ?? []
  const income = data.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const expense = data.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const transferOut = (transferOutRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0)
  const transferIn = (transferInRes.data ?? []).reduce((s, t) => s + Number(t.amount), 0)

  return initialBalance + income - expense - transferOut + transferIn
}
```

Restrições: não reescrever o hook inteiro. Alterar apenas o corpo de `getAccountBalance`. Não alterar a assinatura da função nem nenhuma outra função do arquivo.

---

## Checklist

- [ ] Task 1 concluída
- [ ] Verificar na página de Contas: conta origem de transferência tem saldo reduzido
- [ ] Verificar na página de Contas: conta destino de transferência tem saldo aumentado
- [ ] Verificar no Dashboard: "Receitas do mês" não inclui transferências (já era correto — confirmar que não regrediu)
- [ ] Verificar no Dashboard: "Despesas do mês" não inclui transferências (já era correto — confirmar que não regrediu)
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "fix: transferências deduzem conta origem e creditam conta destino no saldo"`
- [ ] `git push origin main && npm run deploy`