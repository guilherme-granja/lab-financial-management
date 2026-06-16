# SPEC — Bugfix: Select Tag valor vazio + Tela de Erro profissional

**Data:** 2026-06-16
**Arquivos afetados:**
- `src/pages/Transactions.tsx`
- `src/pages/ErrorPage.tsx` *(novo)*
- `src/router/index.tsx`

**Não tocar em:**
- `src/hooks/useTags.ts`
- `src/pages/Tags.tsx`
- `src/components/ui/select.tsx`

**Modelo:** Sonnet padrão

---

## Contexto

A implementação da feature de Tags introduziu um `<SelectItem value="">Sem tag</SelectItem>` no modal de criação/edição de transação. O Radix UI proíbe `value=""` em `SelectItem` pois string vazia é o token reservado para "nenhum item selecionado" (placeholder). O resultado é um crash que derruba toda a tela de Transações ao abrir o modal. Além disso, o router não possui `errorElement`, então qualquer erro de runtime exibe a tela padrão do React Router — genérica e sem identidade visual do projeto.

---

## Task 1 — Bugfix: SelectItem de Tag com valor vazio

**Arquivo:** `src/pages/Transactions.tsx`
> Review: não

Na linha ~711, dentro do dialog de criação/edição, o SelectItem "Sem tag" usa `value=""`. Substituir pelo sentinel `"none"` e ajustar a lógica que lê esse valor.

**Correção no JSX** (campo Tag no dialog, aprox. linha 704–714):
```tsx
// DE:
<SelectItem value="">Sem tag</SelectItem>

// PARA:
<SelectItem value="none">Sem tag</SelectItem>
```

**Correção no estado inicial** `EMPTY_FORM` (aprox. linha 53) e em `openEdit` (aprox. linha 134) — o campo `tag_id` já usa `''`; manter como está, pois `''` é válido no `value` do `Select` raiz (só é inválido em `SelectItem`).

**Correção no `handleSave`** (aprox. linha 197): o payload já faz `form.tag_id || null`, o que converte `"none"` e `""` corretamente para `null`. Não precisa alterar.

**Correção no `onValueChange`** do Select de Tag (aprox. linha 705): ao selecionar "Sem tag" (`"none"`), o `form.tag_id` receberá `"none"`. Ajustar o handler para normalizar:
```tsx
onValueChange={(v) => setForm((f) => ({ ...f, tag_id: v === 'none' ? '' : v }))}
```

Isso garante que selecionar "Sem tag" volta `tag_id` para `''`, e o `payload` continua enviando `null` para o banco via `form.tag_id || null`.

---

## Task 2 — Página de erro profissional

**Arquivo:** `src/pages/ErrorPage.tsx` *(criar)*
> Review: não

Criar componente de erro usando `useRouteError` do React Router e `useNavigate`. Layout com o tema dark do projeto, sem `PageWrapper` (erro pode ocorrer antes do layout carregar).

Estrutura visual:
- Fundo `bg-[#0f1117]` full-screen, conteúdo centralizado vertical e horizontalmente.
- Ícone `AlertTriangle` (lucide-react) em `text-red-400`, tamanho 48.
- Título `"Algo deu errado"` em `text-slate-100 text-2xl font-semibold`.
- Subtítulo `"Ocorreu um erro inesperado na aplicação."` em `text-slate-400`.
- Bloco de detalhes técnicos colapsável (opcional, mas útil em dev): exibir `error.message` ou `error.statusText` em `<pre>` com `text-xs text-slate-500 bg-[#1a1d27] rounded p-3 max-h-32 overflow-y-auto`.
- Dois botões lado a lado:
  - "Voltar" → `navigate(-1)`, variant ghost, `text-slate-400`
  - "Ir para o Dashboard" → `navigate('/')`, `bg-indigo-600 hover:bg-indigo-700 text-white`

```tsx
import { useRouteError, useNavigate } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ErrorPage() {
  const error = useRouteError() as { message?: string; statusText?: string }
  const navigate = useNavigate()
  const message = error?.message || error?.statusText || 'Erro desconhecido'
  // ...
}
```

---

## Task 3 — Registrar errorElement no router

**Arquivo:** `src/router/index.tsx`
> Review: não

Importar `ErrorPage` e adicionar `errorElement` na rota raiz (o objeto com `element: <PrivateRoute />`). Isso cobre todos os erros das rotas filhas.

```tsx
import ErrorPage from '@/pages/ErrorPage'

// No array de rotas:
{
  element: <PrivateRoute />,
  errorElement: <ErrorPage />,
  children: [ ... ] // sem alteração
}
```

Também adicionar `errorElement` nas rotas públicas para cobrir `/login` e `/auth/callback`:
```tsx
{ path: '/login', element: <Login />, errorElement: <ErrorPage /> },
{ path: '/auth/callback', element: <AuthCallback />, errorElement: <ErrorPage /> },
```

---

## Checklist

- [ ] Task 1 concluída — `SelectItem value="none"` corrigido; abrir modal de criar/editar não causa mais crash
- [ ] Task 2 concluída — `ErrorPage.tsx` criado com layout dark e botões de navegação
- [ ] Task 3 concluída — `errorElement` registrado em todas as rotas
- [ ] Testar: abrir modal de nova transação → selecionar "Sem tag" → salvar → sem erro
- [ ] Testar: navegar para rota inválida → ver `ErrorPage` com visual do projeto
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "fix: SelectItem tag valor vazio + ErrorPage profissional"`
- [ ] `git push origin main && npm run deploy`