# SPEC — Modal Close Protection (Esc / Click Fora)

**Data:** 2026-06-17
**Arquivos afetados:**
- `src/components/ui/dialog.tsx`
- `src/pages/Transactions.tsx`
- `src/pages/Categories.tsx`
- `src/pages/Accounts.tsx`
- `src/pages/Tags.tsx`

**Não tocar em:**
- Hooks (`useTransactions`, `useCategories`, `useAccounts`, `useTags`)
- Modais de **confirmação de exclusão** (não têm formulário — devem continuar fechando normalmente)
- Modal de **pagamento** (`payingTx`) em Transactions.tsx — avaliar se tem dados preenchíveis; se sim, aplicar o mesmo padrão

**Modelo:** Sonnet 4.6 High

---

## Contexto

O `DialogContent` de shadcn/ui (Radix UI) fecha automaticamente ao pressionar `Esc` ou clicar no overlay (`onInteractOutside`). Isso está causando perda de dados: o usuário preenche um formulário, clica acidentalmente fora da modal, e perde tudo. O comportamento correto é bloquear esses eventos por padrão no `DialogContent`, de forma que **todas** as modais de formulário da aplicação ganhem proteção automaticamente sem que cada página precise ser alterada individualmente. Modais sem formulário (confirmação de exclusão, modal de pagamento rápido) não precisam da proteção — ou já fecham via `onOpenChange`, ou serão mantidas com comportamento padrão.

---

## Task 1 — Bloquear Esc e click fora no `DialogContent`

**Arquivo:** `src/components/ui/dialog.tsx`
> Review: não

No `DialogPrimitive.Content`, adicionar dois event handlers que interceptam e cancelam os eventos de fechamento automático:

```tsx
<DialogPrimitive.Content
  ref={ref}
  onEscapeKeyDown={(e) => e.preventDefault()}
  onInteractOutside={(e) => e.preventDefault()}
  className={cn(...)}
  {...props}
>
```

Esses dois handlers devem ser inseridos **antes** do spread `{...props}`, para que qualquer página que precise de comportamento diferente ainda possa sobrescrever passando seus próprios `onEscapeKeyDown` / `onInteractOutside`.

Não alterar mais nada no arquivo — sem novos componentes, sem mudanças de estilo.

---

## Task 2 — Garantir que o botão X e "Cancelar" ainda fecham

**Arquivo:** `src/pages/Transactions.tsx`
> Review: sim

Com o `onInteractOutside` bloqueado no `DialogContent`, o `DialogPrimitive.Close` (botão X no canto superior) continua funcionando normalmente — ele chama `onOpenChange(false)` diretamente, sem depender dos eventos de overlay.

Verificar as três modais de formulário neste arquivo:

1. **Modal de criar/editar transação** (`open={dialogOpen}`) — confirmar que o botão "Cancelar" chama `setDialogOpen(false)` (linha ~970). ✓ já faz isso.
2. **Modal de pagamento** (`open={!!payingTx}`) — tem campos `paid_at` e `paid_amount`. Aplicar a mesma proteção sobrescrevendo os handlers na própria `DialogContent` desta modal, caso o comportamento padrão do componente não seja suficiente. Como a Task 1 já bloqueia globalmente, verificar se este modal precisa de tratamento especial.
3. **Modais de exclusão** (`open={!!deleteId}`, `open={!!deleteTx}`) — **não** têm formulário. Nestas, restaurar o comportamento padrão de fechamento passando os handlers explicitamente no `DialogContent`:

```tsx
<DialogContent
  onEscapeKeyDown={(e) => { e.preventDefault(); setDeleteId(null) }}
  onInteractOutside={(e) => { e.preventDefault(); setDeleteId(null) }}
>
```

> Alternativa mais simples: manter os handlers de exclusão como `undefined` (não passar nada) para que o `{...props}` sobrescreva os defaults do `DialogContent`. Isso funciona porque `{...props}` é aplicado depois dos handlers fixos na Task 1. Use a alternativa se for mais limpa.

Não reescrever as funções de formulário, não alterar lógica de `handleSave`, não mexer em filtros ou tabela.

---

## Task 3 — Verificar Categories, Accounts e Tags

**Arquivo:** `src/pages/Categories.tsx`, `src/pages/Accounts.tsx`, `src/pages/Tags.tsx`
> Review: não

Com a Task 1 aplicada, as modais de formulário dessas páginas já ganham proteção automaticamente — não é necessária nenhuma alteração nelas.

Verificar apenas as **modais de confirmação de exclusão** em cada arquivo:
- `Categories.tsx` — `open={!!deleteId}` com `onOpenChange={closeDeleteDialog}` (linha ~396)
- `Accounts.tsx` — `open={!!deleteId}` com `onOpenChange={closeDelete}` (linha ~342)
- `Tags.tsx` — `open={!!tagToDelete}` com `onOpenChange={() => setTagToDelete(null)}` (linha ~149)

Para cada uma, sobrescrever os handlers bloqueados passando `onEscapeKeyDown` e `onInteractOutside` que chamam a respectiva função de fechar:

```tsx
<DialogContent
  onEscapeKeyDown={() => closeDeleteDialog()}
  onInteractOutside={() => closeDeleteDialog()}
>
```

Adaptar o nome da função para cada página. Não alterar mais nada — sem toque em formulários, hooks ou layout.

---

## Checklist

- [ ] Task 1 concluída — `dialog.tsx` com handlers de bloqueio
- [ ] Task 2 concluída — Transactions.tsx com modais de exclusão restauradas
- [ ] Task 3 concluída — modais de exclusão em Categories, Accounts e Tags restauradas
- [ ] Teste manual: preencher formulário → clicar fora → dados persistem
- [ ] Teste manual: pressionar Esc com formulário aberto → modal não fecha
- [ ] Teste manual: clicar X ou "Cancelar" → modal fecha normalmente
- [ ] Teste manual: clicar fora de modal de exclusão → modal fecha normalmente
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat: bloquear fechamento acidental de modais com formulário"`
- [ ] `git push origin main && npm run deploy`