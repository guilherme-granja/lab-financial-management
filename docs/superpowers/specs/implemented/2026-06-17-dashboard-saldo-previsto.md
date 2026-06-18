# SPEC — Dashboard: Bloco "Saldo Previsto"

**Data:** 2026-06-17
**Arquivos afetados:** `src/pages/Dashboard.tsx`
**Não tocar em:** queries existentes do `Promise.all`, cards de Receitas/Despesas/Saldo/A pagar, charts, tabela de transações recentes, arquivos de configuração
**Modelo:** Sonnet padrão
**Paralelismo:** —

---

## Contexto

O Dashboard exibe quatro cards de resumo e já possui `summary.pending` com o total de despesas pendentes do mês. Não existe ainda nenhuma visão que cruze o saldo atual com as despesas pendentes para projetar o saldo ao final do mês. A interface deve mostrar esse bloco apenas quando houver despesas pendentes.

---

## Task 1 — Saldo Previsto: cálculo e banner condicional

**Arquivo:** `src/pages/Dashboard.tsx`
> Review: sim

**1.** Adicionar `projected: number` à interface `MonthSummary` (linha ~19) e inicializar com `0` no `useState`.

**2.** No bloco onde `setSummary` é chamado, calcular e incluir:

```ts
projected: income - expenses - pending
```

**3.** Adicionar `CalendarClock` ao import de `lucide-react`.

**4.** Inserir um banner condicional (`summary.pending > 0`) entre a grid de Summary Cards e a grid de Charts. O banner deve:
- Ter largura total, fundo sutil `indigo-950/20`, borda `indigo-500/30`, bordas arredondadas
- Exibir a equação visual: **Saldo atual** `−` **A pagar** `=` **Saldo previsto** — cada elemento com label muted acima e valor abaixo
- Cores: saldo atual segue verde/vermelho conforme valor; a pagar em `yellow-500`; saldo previsto em `green-400` ou `red-400` conforme valor
- Ícone `CalendarClock` em `indigo-400` alinhado à direita

Não reescrever nenhum card existente nem a estrutura de grids ao redor.

---

## Checklist

- [ ] Task 1 concluída
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat: dashboard exibe saldo previsto quando há despesas pendentes"`
- [ ] `git push origin main && npm run deploy`