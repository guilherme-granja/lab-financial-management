---
description: Apply consistent visual design for this React + Supabase project. Use automatically when creating or editing any React component, page, UI layout, form, dashboard, or frontend artifact.
when_to_use: Triggered whenever the task involves JSX, TSX, CSS, Tailwind classes, UI components, or visual output. Also apply when reviewing or refactoring existing components.
---

# Frontend Design Skill

## Stack

- React 19 + TypeScript 6
- Tailwind CSS v4 (`@import "tailwindcss"` + `@theme` block in `src/index.css`)
- shadcn/ui components (already installed in `src/components/ui/`)
- lucide-react for icons
- Supabase for auth, database, storage

## Dark Theme (somente dark — não há light mode)

### Cores de fundo
| Camada | Valor |
|--------|-------|
| App shell | `bg-[#0f1117]` |
| Cards / painéis | `bg-[#1a1d27]` |
| Bordas | `border-[#2d3148]` |

### Texto
| Role | Classe |
|------|--------|
| Primário | `text-slate-200` |
| Muted / label | `text-slate-400` |
| Placeholder / desabilitado | `text-slate-500` |

### Cor de ação primária
- Botão principal: `bg-indigo-600 hover:bg-indigo-700 text-white`
- Ring / focus: já mapeado via CSS var `--ring: 239 84% 67%`

### Cores semânticas
| Significado | Classe |
|-------------|--------|
| Receita / positivo | `text-green-500` |
| Despesa / negativo | `text-red-500` |
| Destrutivo | `text-red-400` (ícone) / `bg-destructive` (botão) |

## Tailwind v4 — Regras obrigatórias

- Usar utility classes padrão (`text-slate-200`, `bg-indigo-600`).
- Valores arbitrários (`bg-[#1a1d27]`, `border-[#2d3148]`) apenas para cores de tema do projeto que não existem no palette padrão — e apenas os que já estão no codebase.
- Não inventar novos valores arbitrários; usar os tokens CSS (`bg-card`, `text-foreground`, `border-border`, etc.) quando disponíveis via `@theme`.
- Sem `@apply` — estilos inline ou classes diretas no JSX.

## Componentes shadcn/ui disponíveis

Sempre importar de `@/components/ui/` (alias configurado):

```
Badge, Button, Card + CardContent + CardHeader + CardTitle,
Dialog + DialogContent + DialogFooter + DialogHeader + DialogTitle,
Input, Label, Progress, Select + SelectContent + SelectItem + SelectTrigger + SelectValue,
Separator, Switch, Table + TableBody + TableCell + TableHead + TableHeader + TableRow, Tabs
```

Não criar componentes primitivos (botão, input, card) do zero — usar os acima.

## Layout padrão de páginas

```tsx
// Dentro do PageWrapper (já provê Sidebar + Header + <main className="flex-1 p-6">)
<div className="space-y-4">
  {/* Cabeçalho da página */}
  <div className="flex items-center justify-between">
    <h2 className="text-slate-200 font-semibold text-lg">Título</h2>
    <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
      <Plus size={16} />
      Ação principal
    </Button>
  </div>

  {/* Conteúdo */}
</div>
```

## Estados obrigatórios em toda operação Supabase

Toda página ou componente que faz queries Supabase DEVE ter:

```tsx
const [loading, setLoading] = useState(true)   // ou vem do hook
const [error, setError] = useState<string | null>(null)

// Loading state
if (loading) return <p className="text-slate-500 text-sm">Carregando...</p>

// Error state
if (error) return <p className="text-red-400 text-sm">{error}</p>

// Empty state
{!loading && items.length === 0 && (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <p className="text-slate-400 text-sm">Nenhum item encontrado.</p>
  </div>
)}
```

Operações de escrita (create/update/delete):

```tsx
const [saving, setSaving] = useState(false)
const [formError, setFormError] = useState<string | null>(null)

async function handleSave() {
  setSaving(true)
  setFormError(null)
  try {
    await supabaseOperation()
  } catch (e) {
    setFormError((e as Error).message)
  } finally {
    setSaving(false)
  }
}
```

Botão durante saving: `disabled={saving}` com texto alternativo ou spinner.

## Padrão de Card

```tsx
<Card className="bg-[#1a1d27] border-[#2d3148]">
  <CardContent className="p-4">
    {/* conteúdo */}
  </CardContent>
</Card>
```

## Padrão de Dialog (create/edit)

```tsx
<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>{editingId ? 'Editar' : 'Novo'} Item</DialogTitle>
    </DialogHeader>

    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
      </div>
      {formError && <p className="text-red-400 text-sm">{formError}</p>}
    </div>

    <DialogFooter>
      <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancelar</Button>
      <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
        {saving ? 'Salvando...' : 'Salvar'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## Padrão de Grid

```tsx
// Cards responsivos
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

// Tabela simples
<div className="overflow-x-auto">
  <Table>
    <TableHeader>
      <TableRow className="border-[#2d3148]">
        <TableHead className="text-slate-400">Coluna</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {items.map(item => (
        <TableRow key={item.id} className="border-[#2d3148] hover:bg-[#1a1d27]">
          <TableCell className="text-slate-200">{item.name}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

## Ícones (lucide-react)

- Tamanhos: `size={13}` (ação em botão ghost pequeno), `size={16}` (botão primário), `size={18}` (ação inline), `size={20}` (ícone de destaque)
- Botões de ação (editar/excluir): `variant="ghost" size="icon" className="h-7 w-7"`
  - Editar: `text-slate-400 hover:text-slate-200`
  - Excluir: `text-slate-400 hover:text-red-400`

## Convenções de nomenclatura

- Componentes: PascalCase (`AccountCard`, `TransactionForm`)
- Ficheiros: kebab-case (`account-card.tsx`, `transaction-form.tsx`)
- Hooks: camelCase com prefixo `use` (`useAccounts`, `useTransactions`)
- Páginas: PascalCase, em `src/pages/`
- Componentes partilhados: em `src/components/` agrupados por domínio (`layout/`, `charts/`, `ui/`)

## Supabase — regras

- Nunca hardcodar URL ou anon key — usar `import.meta.env.VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
- Client Supabase obtido via `useSupabaseClient()` dentro de hooks — nunca importado como singleton estático
- Queries em hooks customizados (`src/hooks/`), não inline nas páginas
- Formatos de moeda via `formatCurrency` de `@/lib/formatters`

## Checklist antes de entregar qualquer componente

- [ ] Estados loading / error / empty implementados
- [ ] Operações de escrita têm `saving` + `formError`
- [ ] Cores e classes condizem com o tema dark do projeto
- [ ] Sem valores arbitrários novos além dos já usados no codebase
- [ ] shadcn/ui usado para primitivos (não componentes custom do zero)
- [ ] Ícones lucide-react com tamanho correto por contexto
- [ ] Ficheiro em kebab-case, componente em PascalCase
- [ ] Sem URL ou key Supabase hardcodadas
