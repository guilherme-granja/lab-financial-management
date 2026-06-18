# SPEC — Bugfix: SearchableSelect dentro de Dialog + DialogDescription ausente

**Data:** 2026-06-16
**Arquivos afetados:**
- `src/components/ui/searchable-select.tsx`
- `src/components/ui/dialog.tsx`
- `src/pages/Transactions.tsx`
- `src/pages/Accounts.tsx`
- `src/pages/Categories.tsx`
- `src/pages/Goals.tsx`
- `src/pages/Tags.tsx`

**Não tocar em:**
- `src/components/ui/popover.tsx`
- `src/components/ui/command.tsx`
- `src/hooks/useTransactions.ts`

**Modelo:** Sonnet 4.6 High

---

## Execução via Claude Code (bash)

```bash
# 1. Confirmar raiz do projeto
pwd  # deve terminar em /lab-financial-management

# 2. Após todas as alterações, validar tipos
npx tsc --noEmit

# 3. Deploy só se tsc retornar exit 0
git add -A
git commit -m "fix: SearchableSelect em Dialog + DialogDescription acessibilidade"
git push origin main
npm run deploy
```

---

## Contexto

Dois bugs distintos, mesma origem: componentes Radix UI usados incorretamente.

**Bug 1 — SearchableSelect não responde dentro do Dialog.**
O `PopoverContent` usa `<PopoverPrimitive.Portal>`, que renderiza o conteúdo fora da árvore DOM do Dialog — num portal no `<body>`. O Radix Dialog captura o foco (`focus trap`) e bloqueia eventos de todos os elementos fora do seu próprio portal. O resultado: o `CommandInput` renderiza visualmente, mas cliques, scroll e digitação são interceptados e descartados pelo Dialog. A solução é remover o portal do `PopoverContent` quando ele está dentro de um Dialog, usando `PopoverContent` sem portal — o `Popover` deve renderizar no mesmo contexto DOM do Dialog.

**Bug 2 — Warning de `aria-describedby` no console.**
O Radix Dialog espera que todo `DialogContent` tenha um `DialogDescription` associado (para leitores de tela saberem o propósito do modal). Sem ele, o Radix lança o warning `Missing Description or aria-describedby`. Esse warning não causa o bug do SearchableSelect, mas indica que os dialogs do projeto inteiro estão sem acessibilidade mínima obrigatória. Os dialogs em `Transactions.tsx`, `Accounts.tsx`, `Categories.tsx`, `Goals.tsx` e `Tags.tsx` precisam de `DialogDescription`.

**Sobre o skill frontend-design:** este skill é voltado para decisões de identidade visual, paleta, tipografia e layout — não se aplica a bugfixes de comportamento de componentes. Para este tipo de problema (interação, acessibilidade, integração entre primitivos Radix), o guia correto é a documentação do próprio Radix UI e boas práticas de composição de componentes.

**Padrão obrigatório daqui em diante:** todo `DialogContent` no projeto DEVE conter `DialogDescription`. Todo componente de seleção com busca DEVE ser validado para funcionar dentro de portais e modais antes de ir para produção.

---

## Task 1 — SearchableSelect: remover portal interno

**Arquivo:** `src/components/ui/searchable-select.tsx`
> Review: sim

O problema está em `PopoverContent`, que internamente usa `<PopoverPrimitive.Portal>` — esse portal coloca o dropdown fora do DOM do Dialog, onde o focus trap do Radix bloqueia todos os eventos.

A solução é criar uma variante sem portal especificamente para uso dentro de Dialogs. Substituir o `<PopoverContent>` do shadcn por `<PopoverPrimitive.Content>` diretamente, sem o portal, mantendo todos os estilos:

```tsx
import * as PopoverPrimitive from '@radix-ui/react-popover'

// Dentro do return do SearchableSelect, trocar:
// <PopoverContent ...>  ← usa portal interno, quebra dentro de Dialog
// Por:
<PopoverPrimitive.Content
  align="start"
  sideOffset={4}
  onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus() }}
  className="z-50 w-[var(--radix-popover-trigger-width)] p-0 rounded-md border border-[#2d3148] bg-[#0f1117] shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
>
  {/* conteúdo do Command — inalterado */}
</PopoverPrimitive.Content>
```

Manter o `<Popover>` (root) e o `<PopoverTrigger>` inalterados. Apenas substituir `<PopoverContent>` por `<PopoverPrimitive.Content>` sem portal.

Adicionar o import de `* as PopoverPrimitive from '@radix-ui/react-popover'` no topo. Remover o import de `PopoverContent` de `@/components/ui/popover` (os outros — `Popover` e `PopoverTrigger` — podem permanecer).

Restrição: não alterar `src/components/ui/popover.tsx` — a variante sem portal é exclusiva do `SearchableSelect`.

---

## Task 2 — Dialog: exportar DialogDescription e torná-la padrão

**Arquivo:** `src/components/ui/dialog.tsx`
> Review: não

`DialogDescription` já existe no arquivo mas não está sendo usada em nenhuma página. Verificar que está exportada (já está). Nenhuma alteração no arquivo em si é necessária — a correção é nas páginas que usam `DialogContent`.

Documentar aqui o **contrato obrigatório** que todas as páginas devem seguir:

```tsx
// PADRÃO OBRIGATÓRIO — todo DialogContent deve ter esta estrutura:
<DialogContent>
  <DialogHeader>
    <DialogTitle>Título visível</DialogTitle>
    <DialogDescription>
      Descrição breve do propósito do modal (para leitores de tela).
      Pode ser visualmente oculta com className="sr-only" se não for desejada visualmente.
    </DialogDescription>
  </DialogHeader>
  {/* conteúdo */}
</DialogContent>
```

---

## Task 3 — Transactions.tsx: adicionar DialogDescription nos 3 dialogs

**Arquivo:** `src/pages/Transactions.tsx`
> Review: não

Adicionar `DialogDescription` em cada um dos 3 `DialogContent` do arquivo. Adicionar `DialogDescription` ao import existente.

**Dialog Nova/Editar transação** (linha ~555):
```tsx
<DialogDescription className="sr-only">
  {editingId ? 'Edite os dados da transação selecionada.' : 'Preencha os dados para criar uma nova transação.'}
</DialogDescription>
```

**Dialog Registrar pagamento** (linha ~778):
```tsx
<DialogDescription className="sr-only">
  Informe os dados do pagamento para registrar a liquidação desta transação.
</DialogDescription>
```

**Dialog Excluir transação** (linha ~817):
```tsx
<DialogDescription className="sr-only">
  Confirme a exclusão permanente desta transação. Esta ação não pode ser desfeita.
</DialogDescription>
```

Todas com `className="sr-only"` — invisíveis na UI, presentes para acessibilidade.

---

## Task 4 — Accounts, Categories, Goals, Tags: adicionar DialogDescription

**Arquivos:** `src/pages/Accounts.tsx`, `src/pages/Categories.tsx`, `src/pages/Goals.tsx`, `src/pages/Tags.tsx`
> Review: não

Seguir o mesmo padrão da Task 3 em cada arquivo. Adicionar `DialogDescription` ao import e inserir uma `<DialogDescription className="sr-only">` dentro de cada `<DialogHeader>` existente.

Descrições sugeridas por dialog:

**Accounts.tsx:**
- Dialog criar/editar conta: `"Preencha os dados para criar ou editar uma conta."`
- Dialog excluir conta: `"Confirme a exclusão permanente desta conta."`

**Categories.tsx:**
- Dialog criar/editar categoria: `"Preencha os dados para criar ou editar uma categoria."`
- Dialog excluir categoria: `"Confirme a exclusão desta categoria e a transferência de suas transações."`

**Goals.tsx:**
- Dialog criar/editar meta: `"Preencha os dados para criar ou editar uma meta financeira."`
- Dialog excluir meta: `"Confirme a exclusão permanente desta meta."`

**Tags.tsx:**
- Dialog criar tag: `"Preencha o nome para criar uma nova tag."`
- Dialog excluir tag: `"Confirme a exclusão permanente desta tag."`

Todas com `className="sr-only"`.

---

## Regra permanente para novas specs e implementações

> **A partir desta spec, toda implementação que criar ou modificar um `DialogContent` DEVE incluir `DialogDescription`. Toda implementação que usar `SearchableSelect`, `Combobox` ou qualquer Popover dentro de um Dialog DEVE validar que o conteúdo do Popover renderiza no mesmo contexto DOM do Dialog (sem portal isolado). Esses dois itens são checklist obrigatório antes de qualquer `git push`.**

---

## Checklist

- [ ] Task 1 — `SearchableSelect` substituiu `PopoverContent` por `PopoverPrimitive.Content` sem portal
- [ ] Task 1 — Testar: abrir modal de transação → clicar em Categoria → digitar no input → scroll funciona
- [ ] Task 2 — Contrato de `DialogDescription` documentado (sem alteração no arquivo)
- [ ] Task 3 — `DialogDescription` adicionada nos 3 dialogs de `Transactions.tsx`
- [ ] Task 4 — `DialogDescription` adicionada em `Accounts.tsx`, `Categories.tsx`, `Goals.tsx`, `Tags.tsx`
- [ ] Zero warnings de `Missing Description or aria-describedby` no console do browser
- [ ] `npx tsc --noEmit` — zero erros
- [ ] `git commit -m "fix: SearchableSelect em Dialog + DialogDescription acessibilidade"`
- [ ] `git push origin main && npm run deploy`