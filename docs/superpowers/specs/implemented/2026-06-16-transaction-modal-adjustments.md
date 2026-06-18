# SPEC — Ajustes no Modal de Transação

**Data:** 2026-06-16
**Arquivos afetados:**
- `src/components/ui/searchable-select.tsx` *(novo)*
- `src/pages/Transactions.tsx`

**Não tocar em:**
- `src/hooks/useTransactions.ts`
- `src/hooks/useCategories.ts`
- `src/components/ui/select.tsx`
- `src/components/ui/money-input.tsx`
- Dialogs de pagamento (Pay Dialog) e exclusão (Delete Dialog)

**Modelo:** Sonnet 4.6 High

---

## Contexto

O modal de criação/edição de transação possui quatro problemas de UX: (1) os campos "Data do pagamento" e "Valor pago" aparecem no form principal quando o switch "Pago" está ativo, mas deveriam existir apenas no Dialog de Pagar; (2) o select de Categoria não tem busca, tornando a lista grande difícil de navegar; (3) o input de Valor usa `type="number"` nativo que ignora vírgula — o componente `MoneyInput` já existe em `src/components/ui/money-input.tsx` e resolve isso, mas não está sendo usado no form; (4) o dropdown de Categoria não tem scroll visível quando a lista ultrapassa a altura da tela.

---

## Task 1 — Componente SearchableSelect

**Arquivo:** `src/components/ui/searchable-select.tsx` *(criar)*
> Review: sim

Criar um componente que imita a API do `Select` do shadcn (`value`, `onValueChange`, `placeholder`) mas adiciona um campo de busca interno. Usar `Popover` + `Command` do shadcn (ambos já disponíveis via `@/components/ui/`) como base.

Interface esperada:

```ts
interface SearchableSelectOption {
  value: string
  label: string       // texto puro para busca (sem emoji)
  display?: string    // ReactNode exibido na lista (com emoji)
  group?: string      // nome do grupo (label de separação)
}

interface SearchableSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  className?: string
}
```

Comportamento:
- Ao abrir o popover, foca automaticamente no input de busca.
- Busca por substring case-insensitive no campo `label` (sem emoji). Exemplo: digitar `"ado"` retorna "Mercado", "Advogado", etc.
- Itens agrupados por `group` quando presente — exibir `CommandGroup` com o nome do grupo como label.
- Scroll interno limitado a `max-h-60 overflow-y-auto` dentro do `CommandList`.
- Item selecionado recebe ícone `Check` à direita (padrão shadcn).
- Ao selecionar, fecha o popover e chama `onValueChange`.
- Estilo do trigger: replicar aparência do `SelectTrigger` com `bg-[#0f1117] border-[#2d3148]`.

Não criar primitivos do zero — usar `Popover`, `PopoverTrigger`, `PopoverContent`, `Command`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem` de `@/components/ui/`.

Se `Command` não estiver instalado no projeto, criar usando `cmdk` (já é dependência do shadcn). Verificar antes de implementar.

---

## Task 2 — Transactions.tsx (4 ajustes cirúrgicos)

**Arquivo:** `src/pages/Transactions.tsx`
> Review: sim

Aplicar os quatro ajustes abaixo. Não reescrever o componente — fazer alterações pontuais em cada trecho identificado.

### Ajuste 1 — Remover "Data do pagamento" e "Valor pago" do form principal

Dentro da seção `{form.paid && (...)}` (aprox. linha 700, após o Switch "Pago"), remover o bloco inteiro do grid de dois campos:

```tsx
// REMOVER este bloco completo:
{form.paid && (
  <div className="grid grid-cols-2 gap-3">
    <div className="space-y-1">
      <Label ...>Data do pagamento</Label>
      <Input type="date" ... />
    </div>
    <div className="space-y-1">
      <Label ...>Valor pago (R$)</Label>
      <Input type="number" ... />
    </div>
  </div>
)}
```

O switch "Pago" permanece. Quando `form.paid === true`, o `handleSave` deve derivar `paid_at` e `paid_amount` automaticamente:
- `paid_at` = `form.date` (a data que o usuário já preencheu no campo Data)
- `paid_amount` = `amount` (o valor principal do form)

Ajustar a linha de derivação em `handleSave` (aprox. linha 175):
```ts
// DE:
const paid_at = form.paid ? form.paid_at || form.date : null
const paid_amount_val = form.paid ? (parseFloat(form.paid_amount) || amount) : null

// PARA:
const paid_at = form.paid ? form.date : null
const paid_amount_val = form.paid ? amount : null
```

Remover `paid_at` e `paid_amount` de `FormState` e de `EMPTY_FORM` pois não são mais necessários no form principal. Manter em `PayFormState` (Pay Dialog) — esse dialog não deve ser alterado.

Ajustar também `openEdit` para não preencher mais `paid_at` e `paid_amount` no form state.

### Ajuste 2 — Categoria pesquisável com SearchableSelect

Substituir o bloco do select de Categoria no form (aprox. linha 630, dentro de `{form.type !== 'transfer' && (...)}`) pelo novo `SearchableSelect`.

Montar as options a partir de `categoryTree`, filtrando por tipo igual a `form.type` ou `'both'`:

```ts
const categoryOptions: SearchableSelectOption[] = categoryTree
  .filter((p) => p.type === form.type || p.type === 'both')
  .flatMap((parent) => {
    const subs = (parent.subcategories ?? []).filter(
      (s) => s.type === form.type || s.type === 'both'
    )
    if (subs.length > 0) {
      return subs.map((sub) => ({
        value: sub.id,
        label: sub.name,                        // para busca (sem emoji)
        display: `${sub.icon} ${sub.name}`,     // para exibição
        group: `${parent.icon} ${parent.name}`, // cabeçalho do grupo
      }))
    }
    return [{
      value: parent.id,
      label: parent.name,
      display: `${parent.icon} ${parent.name}`,
    }]
  })
```

Usar `SearchableSelect` com `placeholder="Selecionar categoria"` e `searchPlaceholder="Buscar categoria..."`. Vincular a `form.category_id` / `onValueChange`.

### Ajuste 3 — Substituir input de Valor por MoneyInput

No campo "Valor (R$)" do form (aprox. linha 555), substituir o `<Input type="number" ...>` por `<MoneyInput>`.

`MoneyInput` recebe `value: number` e `onChange: (value: number) => void`. O `FormState` mantém `amount` como `string` para compatibilidade com o resto do form; fazer a conversão na ponte:

```tsx
// DE:
<Input
  type="number"
  step="0.01"
  ...
  value={form.amount}
  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
/>

// PARA:
<MoneyInput
  value={parseFloat(form.amount) || 0}
  onChange={(v) => setForm((f) => ({ ...f, amount: String(v) }))}
  className="bg-[#0f1117] border-[#2d3148]"
/>
```

Importar `MoneyInput` de `@/components/ui/money-input`.

### Ajuste 4 — Scroll no dropdown de Categoria (filtro da página)

O select de Categoria na barra de filtros da página (não o do modal) usa `SelectContent` do shadcn. O `SelectContent` em `src/components/ui/select.tsx` já usa `max-h-[--radix-select-content-available-height]` via Radix, mas pode estar sem altura máxima explícita que force o scroll.

No bloco do filtro de Categoria (aprox. linha 340), adicionar `className` com altura máxima e scroll ao `SelectContent`:

```tsx
<SelectContent className="bg-[#1a1d27] border-[#2d3148] max-h-72 overflow-y-auto">
```

Aplicar o mesmo no `SelectContent` do campo Categoria dentro do **modal** — mas como o modal agora usa `SearchableSelect` (Ajuste 2), isso já está resolvido pelo scroll interno do `CommandList`. A correção de scroll com `max-h-72` se aplica apenas ao filtro da barra de filtros da página.

---

## Checklist

- [ ] Task 1 concluída — `SearchableSelect` criado e funcionando com busca por substring
- [ ] Task 2 concluída — 4 ajustes aplicados em `Transactions.tsx`
  - [ ] Ajuste 1: "Data do pagamento" e "Valor pago" removidos do form; `handleSave` usa `form.date` e `amount`
  - [ ] Ajuste 2: Categoria usa `SearchableSelect` com busca por substring
  - [ ] Ajuste 3: Input de Valor substituído por `MoneyInput`
  - [ ] Ajuste 4: Scroll no dropdown de Categoria do filtro da página
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "fix: ajustes UX no modal de transação"`
- [ ] `git push origin main && npm run deploy`