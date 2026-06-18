# Arquitetura — Lab Financial Management

Este documento define a arquitetura obrigatória do projeto. O Claude Code deve ler e seguir estas regras antes de criar ou modificar qualquer arquivo em `src/`.

---

## Camadas da aplicação

```
src/
├── pages/          → UI pura, sem lógica de negócio, sem Supabase
├── hooks/          → toda lógica de negócio e acesso ao banco
├── lib/
│   ├── supabase.ts → instância única do client Supabase
│   └── formatters.ts / utils.ts → utilitários puros
├── components/
│   ├── ui/         → componentes genéricos reutilizáveis (shadcn/ui + customizados)
│   └── layout/     → Header, Sidebar, PageWrapper
├── types/index.ts  → todos os tipos compartilhados
└── router/index.tsx → rotas e guard de autenticação
```

---

## Regra fundamental de camadas

**Supabase nunca é chamado diretamente em `src/pages/` nem em `src/components/`.**

Todo acesso ao banco de dados passa obrigatoriamente por um hook em `src/hooks/`.

### Certo

```ts
// src/hooks/useDashboard.ts
import { supabase } from '@/lib/supabase'

export function useDashboard() {
  // queries aqui
}
```

```tsx
// src/pages/Dashboard.tsx
import { useDashboard } from '@/hooks/useDashboard'

export default function Dashboard() {
  const { summary, loading } = useDashboard()
  // apenas JSX
}
```

### Errado

```tsx
// src/pages/Dashboard.tsx — PROIBIDO
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const { data } = await supabase.from('transactions').select('*') // NÃO FAZER
}
```

**Violações desta regra bloqueiam o commit.**

---

## Estrutura obrigatória de hooks

Todo hook que acessa o Supabase deve expor:

```ts
// Para queries (leitura)
{
  data: T[]        // resultado
  loading: boolean // estado de carregamento
  error: string | null // mensagem de erro traduzida para PT-BR
  refetch: () => void  // recarregar manualmente
}

// Para mutações (insert/update/delete)
{
  saving: boolean
  formError: string | null
  create: (payload: Payload) => Promise<void>
  update: (id: string, payload: Partial<Payload>) => Promise<void>
  remove: (id: string) => Promise<void>
}
```

Os estados `loading`, `error`, `saving` e `formError` são obrigatórios em toda operação Supabase.

---

## Regras de TypeScript

- Sem `any` em nenhum lugar — usar tipos específicos ou `unknown`
- Tipos de domínio ficam em `src/types/index.ts`
- Tipos de payload (input de formulário) ficam no mesmo arquivo do hook que os usa
- Nunca criar tipos duplicados — verificar `src/types/index.ts` antes de definir um novo tipo

---

## Regras de componentes

- Componentes em PascalCase, arquivos em kebab-case
- `DialogContent` sempre inclui `DialogDescription` (acessibilidade)
- `Popover`/`Combobox` dentro de `Dialog` nunca usam portal isolado
- `@/` resolve para `src/` — sempre usar o caminho físico `src/` ao criar arquivos novos

---

## Imports

Ordem obrigatória:

```ts
// 1. Externos (react, date-fns, lucide-react, etc.)
// 2. Internos (@/hooks, @/components, @/lib, @/types)
// 3. Tipos (import type ...)
```

---

## Formatação

- Moeda: `formatCurrency()` de `@/lib/formatters` → `R$ 1.234,56`
- Data: `formatDate()` de `@/lib/formatters` → `dd/MM/yyyy`
- Input monetário: componente `MoneyInput` de `@/components/ui/money-input`
- Receitas: `text-green-500`, despesas: `text-red-500`, transferências: `text-blue-400`

---

## Arquivos protegidos

Nunca alterar sem uma spec dedicada:

- `src/lib/supabase.ts`
- `src/router/index.tsx`
- `src/types/index.ts` (só adicionar, nunca remover/renomear tipos existentes)
- `src/hooks/useAuth.tsx`
- `vite.config.ts`, `tsconfig*.json`, `tailwind.config.*`

---

## Referências

- Template de spec: `docs/superpowers/spec-template.md`
- Critérios de review: `.claude/code-review-spec.md`
- Design tokens e padrões de UI: `.claude/skills/frontend-design/SKILL.md`