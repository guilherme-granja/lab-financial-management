# SPEC — Efetivar Transação: Renomear e Corrigir Campo de Valor

**Data:** 2026-06-17
**Arquivos afetados:**
- `src/pages/Transactions.tsx`

**Não tocar em:**
- Hooks, tipos, banco de dados
- Qualquer lógica de `handlePay`, `updateTransactionPayment` ou estados existentes
- Qualquer outra página ou componente

**Modelo:** Sonnet padrão

---

## Contexto

O botão de ação para efetivar transações pendentes exibe o ícone `CreditCard` com `title="Pagar"`, e a modal que abre tem título "Registrar pagamento" com um campo "Valor pago" usando `<Input type="number">`. Dois problemas: o vocabulário "Pagar/Pagamento" não faz sentido para transações do tipo Receita; e o campo de valor não segue o padrão `MoneyInput` usado no restante do formulário de transações.

---

## Task 1 — Renomear textos de "Pagar" para "Efetivar"

**Arquivo:** `src/pages/Transactions.tsx`
> Review: não

Localizar e substituir os três textos relacionados ao fluxo de pagamento:

**Botão de ação na tabela** (linha ~900, `title="Pagar"`):
```tsx
// Antes
title="Pagar"

// Depois
title="Efetivar"
```

**Título da modal** (linha ~981, `<DialogTitle>`):
```tsx
// Antes
<DialogTitle>Registrar pagamento</DialogTitle>

// Depois
<DialogTitle>Efetivar transação</DialogTitle>
```

**Label do campo de valor** (linha ~990, `<Label>`):
```tsx
// Antes
<Label className="text-slate-400 text-xs">Valor pago (R$)</Label>

// Depois
<Label className="text-slate-400 text-xs">Valor efetivado (R$)</Label>
```

Não renomear variáveis internas (`payingTx`, `payForm`, `handlePay`, `paid_amount`, `paid_at`) — são nomes de estado/função internos, não textos de UI.

---

## Task 2 — Substituir campo de valor por `MoneyInput`

**Arquivo:** `src/pages/Transactions.tsx`
> Review: não

`MoneyInput` já está importado no topo do arquivo. Substituir o `<Input type="number">` do campo de valor na modal de efetivar pelo componente correto:

```tsx
// Antes
<Input
  type="number"
  step="0.01"
  min="0"
  value={payForm.paid_amount}
  onChange={(e) => setPayForm((f) => ({ ...f, paid_amount: e.target.value }))}
  className="bg-[#0f1117] border-[#2d3148]"
/>

// Depois
<MoneyInput
  value={parseFloat(payForm.paid_amount) || 0}
  onChange={(v) => setPayForm((f) => ({ ...f, paid_amount: String(v) }))}
  className="bg-[#0f1117] border-[#2d3148]"
/>
```

O estado `payForm.paid_amount` continua sendo `string` (já existe assim) — a conversão `parseFloat / String` mantém compatibilidade com `handlePay`, que já faz `parseFloat(payForm.paid_amount)` internamente. Não alterar `handlePay` nem `PayFormState`.

---

## Checklist

- [ ] Task 1 concluída — "Pagar" → "Efetivar", "Registrar pagamento" → "Efetivar transação", "Valor pago" → "Valor efetivado"
- [ ] Task 2 concluída — campo de valor substituído por `MoneyInput`
- [ ] Teste manual: transação pendente do tipo Receita → botão exibe "Efetivar" no tooltip
- [ ] Teste manual: abrir modal → título "Efetivar transação", campo formata em R$
- [ ] Teste manual: digitar valor no `MoneyInput` → `handlePay` salva corretamente
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "fix: renomear pagar para efetivar e usar MoneyInput na modal"`
- [ ] `git push origin main && npm run deploy`