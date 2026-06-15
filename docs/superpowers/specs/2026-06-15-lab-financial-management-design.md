# Lab Financial Management — Design Spec

**Date:** 2026-06-15  
**Status:** Approved

---

## Overview

SPA React para controle de finanças pessoais. Single user, auth via GitHub OAuth (Supabase). Deploy via gh-pages em `/lab-financial-management/`.

---

## Stack

| Camada | Tecnologia |
|---|---|
| UI | React 18 + Vite 5 + TypeScript (strict, sem `any`) |
| Roteamento | React Router DOM v6 |
| Componentes | shadcn/ui — Default / Slate / dark |
| Estilos | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Gráficos | Recharts v2 |
| Ícones | Lucide React (via shadcn) |
| Datas | date-fns v3 |
| Backend | Supabase JS v2 (DB + Auth) |
| Deploy | gh-pages |

---

## Variáveis de Ambiente

```
VITE_SUPABASE_URL=https://cutjwwnwfyfidkxqgjdk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ALLOWED_EMAIL=guilhermegranja.dev@gmail.com
```

`.env.example` com mesmos campos sem valores.

---

## Banco de Dados (já existe no Supabase com RLS + seed)

### categories
`id, name, color, icon, type (income|expense|both), created_at`

### transactions
`id, amount, type (income|expense), category_id, description, date, created_at`

### goals
`id, category_id, amount, period_type (monthly|yearly), period_start, created_at`

> Tabelas, políticas RLS e seed de categorias já configurados. Nenhuma migration necessária.

---

## Autenticação

- Provider: GitHub OAuth via Supabase
- Whitelist: `user.email === VITE_ALLOWED_EMAIL`
- Email não autorizado → `supabase.auth.signOut()` + redirect `/login` com mensagem de erro
- `useAuth` expõe: `{ user, loading, signInWithGithub, signOut }`
- `AuthCallback` renderiza "Autenticando..." e aguarda o callback do Supabase

---

## Rotas

| Rota | Componente | Protegida |
|---|---|---|
| `/login` | Login.tsx | Não |
| `/auth/callback` | AuthCallback.tsx | Não |
| `/` | Dashboard.tsx | Sim |
| `/transactions` | Transactions.tsx | Sim |
| `/categories` | Categories.tsx | Sim |
| `/reports` | Reports.tsx | Sim |
| `/goals` | Goals.tsx | Sim |

`PrivateRoute` redireciona para `/login` se não autenticado.

---

## Design System — Dark Theme

| Token | Valor |
|---|---|
| Background | `#0f1117` |
| Surface (cards) | `#1a1d27` |
| Primary | `#6366f1` (indigo) |
| Success / receita | `#22c55e` |
| Danger / despesa | `#ef4444` |
| Texto principal | `#e2e8f0` |
| Texto secundário | `#94a3b8` |
| Border | `#2d3148` |

`<html class="dark">` em `index.html`. CSS variables do shadcn sobrescritas em `index.css`.

---

## Estrutura de Pastas

```
src/
  components/
    charts/       # LineChart, PieChart, BarChart wrappers (Recharts)
    layout/       # Sidebar, Header, PageWrapper
  pages/
    Login.tsx
    Dashboard.tsx
    Transactions.tsx
    Categories.tsx
    Reports.tsx
    Goals.tsx
    AuthCallback.tsx
  hooks/
    useAuth.ts
    useTransactions.ts
    useCategories.ts
    useGoals.ts
  lib/
    supabase.ts
    formatters.ts
    utils.ts      # cn() helper
  types/
    index.ts
  router/
    index.tsx
  App.tsx
  main.tsx
```

---

## Types

```ts
export type CategoryType = 'income' | 'expense' | 'both'
export type TransactionType = 'income' | 'expense'
export type PeriodType = 'monthly' | 'yearly'

export interface Category {
  id: string
  name: string
  color: string
  icon: string
  type: CategoryType
  created_at: string
}

export interface Transaction {
  id: string
  amount: number
  type: TransactionType
  category_id: string | null
  description: string | null
  date: string
  created_at: string
  categories?: Category
}

export interface Goal {
  id: string
  category_id: string
  amount: number
  period_type: PeriodType
  period_start: string
  created_at: string
  categories?: Category
}
```

---

## Páginas — Funcionalidades

### Login.tsx
- Tela centralizada: logo + nome do app
- Botão "Entrar com GitHub" (`<Button>` shadcn + ícone Github Lucide)
- Se autenticado → redirect `/`

### Dashboard.tsx
- 3 `<Card>` shadcn: Receitas do mês / Despesas do mês / Saldo
- Gráfico de linha: saldo dos últimos 6 meses (Recharts)
- Gráfico de pizza: despesas por categoria do mês (Recharts)
- Tabela das 5 transações mais recentes (`<Table>` shadcn)

### Transactions.tsx
- Filtros: período (mês/ano), tipo, categoria (`<Select>` shadcn)
- `<Table>` shadcn: data, descrição, categoria, tipo, valor
- Botão "Nova transação" → `<Dialog>` shadcn (Input, Select, Label)
- Ações por linha: editar, excluir
- Paginação: 20 por página

### Categories.tsx
- Grid de `<Card>` shadcn: ícone + nome + cor + tipo
- Botão "Nova categoria" → `<Dialog>` shadcn
- Dialog: name, icon (emoji), color (`input type="color"`), type
- Ações: editar, excluir (confirmação via segundo Dialog)

### Reports.tsx
- `<Tabs>` shadcn: Resumo / Gráfico
- Seletor de período (`<Select>` shadcn)
- Tabela: categoria → total → % do total
- Gráfico de barras: receitas vs despesas por mês (Recharts)
- Botão exportar CSV

### Goals.tsx
- Lista de metas com `<Progress>` shadcn
- `<Badge>` shadcn: amarelo > 80%, vermelho > 100%
- Botão "Nova meta" → `<Dialog>` shadcn
- Dialog: category_id, amount, period_type, period_start

---

## Layout

- Sidebar fixa à esquerda (desktop): links Dashboard, Transações, Categorias, Relatórios, Metas
- Item ativo: bg primária destacado
- Header: título da página + botão logout (`<Button variant="ghost">`)
- Mobile: sidebar vira drawer com botão hamburguer

---

## Formatters (lib/formatters.ts)

- `formatCurrency(value: number)` → `R$ 1.234,56` (pt-BR)
- `formatDate(dateStr: string)` → `dd/MM/yyyy`
- `formatMonth(dateStr: string)` → `Janeiro 2025`

---

## vite.config.ts

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/lab-financial-management/',
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

---

## package.json scripts

```json
"dev": "vite",
"build": "tsc && vite build",
"preview": "vite preview",
"deploy": "tsc && vite build && gh-pages -d dist"
```

---

## Restrições

- TypeScript estrito — sem `any`
- UI em português brasileiro
- Valores: `R$` com 2 casas decimais
- Datas: `dd/MM/yyyy`
- Usar shadcn/ui sempre que disponível; Tailwind para layout/espaçamento
- Após cada página: `tsc --noEmit` com zero erros antes de continuar
- Commits organizados por feature
