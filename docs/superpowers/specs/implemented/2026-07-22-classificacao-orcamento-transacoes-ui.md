# Classificação do Orçamento na Transação — Formulário, Coluna e Filtro

**Data:** 2026-07-22
**Pré-requisito:** spec `2026-07-22-classificacao-orcamento-fundacao.md` já aplicada (schema, tipos, `useTransactions` com `budget_bucket` no payload e no filtro).
**Arquivos afetados:**
- `src/pages/Transactions.tsx`

**Não tocar em:**
- `src/hooks/useTransactions.ts` (já ajustado na spec de fundação)
- `src/pages/Categories.tsx`, `src/hooks/useCategories.ts`
- Qualquer lógica de página de Orçamento/Metas (ainda não construída)
- Demais páginas e componentes

**Modelo:** Sonnet 4.6 High (várias mudanças coordenadas em um único arquivo já complexo)

**Atenção:** `project_knowledge_search` está significativamente desatualizado para `Transactions.tsx` — o arquivo já passou por refatoração de responsividade mobile, busca global de transações e o seletor de colunas "Colunas" (visibilidade de coluna com checkboxes, persistido em `localStorage`), nenhum dos quais está refletido no índice. **Leia o arquivo real do repositório antes de começar qualquer task desta spec** e siga os padrões (nomes de estado, estrutura do array de configuração de colunas, chave de `localStorage`) exatamente como estão implementados hoje — não recrie nem renomeie nada que já exista.

---

## Contexto

Com `budget_bucket` agora vivendo em `transactions` (spec de fundação), esta spec cobre a superfície visual em `Transactions.tsx`:

1. Seção própria no formulário de criação/edição, visível só para despesa, obrigatória.
2. Nova coluna opcional "Classificação" no seletor "Colunas" já existente — oculta por padrão.
3. Novo filtro "Classificação" na barra de filtros, com as opções Contas / Lazer / Não classificado.

Mockup de referência aprovado: seções "1. Formulário", "2. Tabela + Colunas" e "3. Filtro" do arquivo `2026-07-22-mockup-classificacao-orcamento-transacao.html`.

---

## Task 1 — FormState e validação

**Arquivo:** `src/pages/Transactions.tsx`
> Review: sim

Ler o arquivo atual primeiro.

Adicionar `budget_bucket: BudgetBucket | null` a `FormState` e a `EMPTY_FORM` (valor inicial `null`).

Em `openEdit`, popular `budget_bucket` a partir de `tx.budget_bucket ?? null`.

Em `handleSave`, adicionar validação: se `form.type === 'expense'` e `form.budget_bucket` é `null`, `setFormError('Selecione a classificação no orçamento')` e retornar cedo — seguir exatamente o padrão das validações existentes (ex: validação de conta de transferência).

No payload montado para `createTransaction`/`updateTransaction`, incluir `budget_bucket: form.type === 'expense' ? form.budget_bucket : null` (nunca enviar valor quando não é despesa).

Ao trocar `form.type` para algo diferente de `'expense'` no `onValueChange` do Select de Tipo, resetar `budget_bucket` para `null` no mesmo `setForm`.

Importar `BudgetBucket` de `@/types`.

---

## Task 2 — Seção "Classificação do Orçamento" no formulário

**Arquivo:** `src/pages/Transactions.tsx`
> Review: sim

Adicionar, logo após o campo de Descrição e antes do campo de Recorrência, um bloco condicional visível apenas quando `form.type === 'expense'`:

- Um separador com o rótulo "Classificação do Orçamento" (mesmo padrão visual de separador com label já usado em outros formulários do projeto, ou `<Separator />` do shadcn com um `<Label>` acima).
- Duas opções selecionáveis lado a lado (grid de 2 colunas), no estilo de toggle já usado no projeto para escolhas binárias (ex: os botões de Tipo Receita/Despesa) — não usar `<Select>` aqui, já que só existem 2 opções e a seleção visual direta reduz erro:
  - **Contas** (`needs`) — ícone 🏠, com legenda curta "Necessidade"
  - **Lazer** (`leisure`) — ícone 🎉, com legenda curta "Supérfluo"
- Estado ativo: borda e texto na cor indigo (Contas) ou âmbar (Lazer) — reaproveitar tons já usados no tema (`indigo-600`/`border-indigo-500` e `amber-500`/`border-amber-500` ou equivalentes já presentes no codebase; não introduzir hex novo).
- Mensagem de erro abaixo do bloco quando `formError` indicar falta de classificação, no mesmo padrão de exibição de erro do restante do formulário.

Rótulo do campo: "Como classificar esse gasto?" com asterisco vermelho (`<span className="text-red-400">*</span>`) indicando obrigatoriedade, igual ao padrão usado em outros campos obrigatórios do projeto.

---

## Task 3 — Nova coluna opcional no seletor "Colunas"

**Arquivo:** `src/pages/Transactions.tsx`
> Review: sim

Localizar a configuração de colunas do seletor "Colunas" existente (array/objeto que define chave, rótulo e visibilidade padrão de cada coluna opcional, e o hook/estado que persiste a seleção em `localStorage`).

Adicionar uma nova entrada seguindo exatamente o mesmo formato das colunas opcionais já existentes:
- Chave: `budget_bucket`
- Rótulo: "Classificação"
- Visibilidade padrão: oculta (mesmo comportamento das demais colunas opcionais)

Não alterar a lista de colunas padrão (sempre visíveis) nem o comportamento de nenhuma coluna já existente.

---

## Task 4 — Célula da coluna na tabela

**Arquivo:** `src/pages/Transactions.tsx`
> Review: sim

Adicionar o `<TableHead>` "Classificação" e o `<TableCell>` correspondente em cada linha, condicionados à visibilidade da coluna (mesmo padrão de renderização condicional já usado pelas demais colunas opcionais).

Conteúdo da célula, por transação:
- `type === 'expense'` e `budget_bucket === 'needs'` → badge "🏠 Contas" (cor indigo, mesmo padrão visual das badges existentes — `variant="outline"` com classes de cor)
- `type === 'expense'` e `budget_bucket === 'leisure'` → badge "🎉 Lazer" (cor âmbar)
- `type === 'expense'` e `budget_bucket === null` → badge "Não classificado" (cinza, borda tracejada — `border-dashed`)
- `type !== 'expense'` (receita ou transferência) → `—` sem badge, já que o conceito não se aplica

---

## Task 5 — Filtro de Classificação

**Arquivo:** `src/pages/Transactions.tsx`
> Review: sim

Adicionar um novo `<Select>` na barra de filtros, ao lado dos filtros existentes (mesmo padrão visual de label + `SelectTrigger`/`SelectContent`/`SelectItem` já usado pelos filtros de Tipo/Status/Categoria):

```tsx
<div className="space-y-1">
  <Label className="text-slate-400 text-xs">Classificação</Label>
  <Select
    value={filters.budgetBucket}
    onValueChange={(v) => setFilters((f) => ({ ...f, budgetBucket: v as TransactionFilters['budgetBucket'] }))}
  >
    <SelectTrigger className="bg-[#1a1d27] border-[#2d3148] text-slate-200 w-40">
      <SelectValue />
    </SelectTrigger>
    <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
      <SelectItem value="all">Todas</SelectItem>
      <SelectItem value="needs">🏠 Contas</SelectItem>
      <SelectItem value="leisure">🎉 Lazer</SelectItem>
      <SelectItem value="unclassified">Não classificado</SelectItem>
    </SelectContent>
  </Select>
</div>
```

Adicionar `budgetBucket: 'all'` ao estado inicial de `filters` (`useState<TransactionFilters>({...})`).

---

## Checklist final

- [x] Task 1 a Task 5 implementadas
- [x] `tsc -p tsconfig.app.json --noEmit --ignoreDeprecations 6.0` — zero erros (restam apenas 2 erros pré-existentes ao baseline, fora do escopo desta spec)
- [x] `npm test` — todos os testes passando (`Transactions.test.tsx` ajustado, `baseTx` inclui `budget_bucket`)
- [x] `git commit`
- [x] `git push origin main && npm run deploy`
