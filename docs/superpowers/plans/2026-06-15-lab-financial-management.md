# Lab Financial Management — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React SPA for controle de finanças pessoais with GitHub OAuth, Supabase backend, dark theme, and deploy via gh-pages.

**Architecture:** Single-page app with React Router v6 data router. `AuthProvider` context wraps the entire app via `main.tsx`. `PrivateRoute` component guards all app routes. Layout uses fixed sidebar (desktop) / hamburger drawer (mobile). Each data hook owns its loading/error state and CRUD functions.

**Tech Stack:** React 18, Vite 5, TypeScript strict, React Router DOM v6, Supabase JS v2, Tailwind CSS v4 (`@tailwindcss/vite`), shadcn/ui, Recharts v2, date-fns v3, gh-pages

---

## File Map

```
src/
  types/index.ts                          # Category, Transaction, Goal types
  lib/
    supabase.ts                           # Supabase client singleton
    formatters.ts                         # formatCurrency, formatDate, formatMonth
    utils.ts                              # cn() — created by shadcn, verify exists
  hooks/
    useAuth.ts                            # AuthContext + AuthProvider + useAuth
    useTransactions.ts                    # paginated list + CRUD (20/page)
    useCategories.ts                      # full list + CRUD
    useGoals.ts                           # list + progress + CRUD
  components/
    layout/
      Sidebar.tsx                         # nav links, mobile drawer
      Header.tsx                          # page title + logout
      PageWrapper.tsx                     # Sidebar + Header + <main>
    charts/
      BalanceLineChart.tsx                # 6-month balance (LineChart)
      ExpensePieChart.tsx                 # expenses by category (PieChart)
      MonthlyBarChart.tsx                 # income vs expenses/month (BarChart)
  pages/
    Login.tsx
    AuthCallback.tsx
    Dashboard.tsx
    Transactions.tsx
    Categories.tsx
    Reports.tsx
    Goals.tsx
  router/index.tsx                        # createBrowserRouter + PrivateRoute
  main.tsx                                # ReactDOM + AuthProvider + RouterProvider
vite.config.ts
tsconfig.json                             # add paths alias
index.html                                # add class="dark"
src/index.css                             # Tailwind import + dark theme overrides
src/vite-env.d.ts                         # ImportMetaEnv declarations
.env                                      # real credentials
.env.example                              # empty template
```

---

## Task 1: Scaffold project and install all dependencies

**Files:**
- Create: entire project scaffold via Vite
- Modify: `package.json` (add deploy script)

- [ ] **Step 1: Scaffold Vite React TypeScript project**

```bash
cd /home/guilherme-granja/Guilherme/lab-financial-management
npm create vite@latest . -- --template react-ts
```

When prompted "Current directory is not empty. Remove existing files and continue?" → select **Ignore files and continue** (keeps `.git` and `docs/`).

- [ ] **Step 2: Install base dependencies**

```bash
npm install
npm install tailwindcss @tailwindcss/vite
npm install @supabase/supabase-js react-router-dom recharts date-fns
npm install -D gh-pages
```

- [ ] **Step 3: Verify node_modules exists**

```bash
ls node_modules | head -5
```

Expected: directories listed (react, vite, etc.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: scaffold vite react-ts project and install dependencies"
```

---

## Task 2: Configure Vite, TypeScript path aliases, and package scripts

**Files:**
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`
- Modify: `tsconfig.app.json` (if it exists)
- Modify: `package.json`

- [ ] **Step 1: Write vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/lab-financial-management/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 2: Add path alias to tsconfig.json (root level)**

Open `tsconfig.json`. Add `baseUrl` and `paths` inside `compilerOptions`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Merge with existing content — do not replace the whole file, just add those two keys inside `compilerOptions`.

- [ ] **Step 3: If tsconfig.app.json exists, add the same paths there**

Check: `ls tsconfig*.json`

If `tsconfig.app.json` exists, add to its `compilerOptions`:
```json
"baseUrl": ".",
"paths": { "@/*": ["./src/*"] }
```

- [ ] **Step 4: Update package.json scripts**

Replace the `scripts` section with:
```json
"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "deploy": "tsc && vite build && gh-pages -d dist"
}
```

- [ ] **Step 5: Install @types/node for path resolution**

```bash
npm install -D @types/node
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: zero errors (or only "Cannot find module" for src files not yet created — that's OK for now).

- [ ] **Step 7: Commit**

```bash
git add vite.config.ts tsconfig.json tsconfig.app.json package.json package-lock.json
git commit -m "chore: configure vite base, path aliases, and build scripts"
```

---

## Task 3: Initialize shadcn/ui and add all required components

**Files:**
- Create: `components.json`
- Create: `src/lib/utils.ts` (auto-generated by shadcn)
- Create: `src/index.css` (auto-generated, will be overridden in Task 4)
- Create: `src/components/ui/` (all shadcn component files)

- [ ] **Step 1: Run shadcn init**

```bash
npx shadcn@latest init
```

When prompted:
- Style: **Default**
- Base color: **Slate**
- CSS variables for colors: **Yes**

- [ ] **Step 2: Add all required shadcn components**

```bash
npx shadcn@latest add button input label card dialog select badge table tabs progress separator
```

Accept all prompts (y).

- [ ] **Step 3: Verify utils.ts was created**

```bash
cat src/lib/utils.ts
```

Expected: file containing `cn()` function using `clsx` and `tailwind-merge`.

If the file is missing or empty, create it:
```ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

Then install the dependencies if needed:
```bash
npm install clsx tailwind-merge
```

- [ ] **Step 4: Verify components exist**

```bash
ls src/components/ui/
```

Expected: `button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `badge.tsx`, `table.tsx`, `tabs.tsx`, `progress.tsx`, `separator.tsx`

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: initialize shadcn/ui and add ui components"
```

---

## Task 4: Configure dark theme

**Files:**
- Modify: `index.html`
- Modify: `src/index.css`

- [ ] **Step 1: Add dark class to HTML element in index.html**

Find `<html` tag and change to:
```html
<html lang="pt-BR" class="dark">
```

- [ ] **Step 2: Inspect the generated src/index.css**

```bash
cat src/index.css
```

Note whether the file uses `hsl()`, `oklch()`, or bare numbers for CSS variables. The override format must match.

- [ ] **Step 3: Replace src/index.css with dark-first theme**

Write the full file. Keep the `@import "tailwindcss"` line that shadcn generated, but replace or add the variable overrides. The final file must be:

```css
@import "tailwindcss";

@layer base {
  :root {
    --radius: 0.5rem;
  }

  .dark {
    --background: 232 17% 8%;
    --foreground: 214 32% 91%;
    --card: 230 20% 12%;
    --card-foreground: 214 32% 91%;
    --popover: 230 20% 12%;
    --popover-foreground: 214 32% 91%;
    --primary: 239 84% 67%;
    --primary-foreground: 0 0% 100%;
    --secondary: 232 22% 23%;
    --secondary-foreground: 214 32% 91%;
    --muted: 232 22% 23%;
    --muted-foreground: 215 20% 65%;
    --accent: 232 22% 23%;
    --accent-foreground: 214 32% 91%;
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;
    --border: 232 22% 23%;
    --input: 232 22% 23%;
    --ring: 239 84% 67%;
  }
}

* {
  border-color: hsl(var(--border));
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: system-ui, -apple-system, sans-serif;
}
```

**Note:** If shadcn generated variables using `oklch()` format (e.g., `--background: oklch(...)`) instead of bare `H S% L%` numbers, match that format. Convert using:
- `#0f1117` → oklch(0.12 0.018 270)
- `#1a1d27` → oklch(0.16 0.022 270)
- `#6366f1` → oklch(0.61 0.22 276)
- `#22c55e` → oklch(0.70 0.18 142)
- `#ef4444` → oklch(0.63 0.22 21)
- `#e2e8f0` → oklch(0.92 0.01 250)
- `#94a3b8` → oklch(0.67 0.03 250)
- `#2d3148` → oklch(0.23 0.04 270)

- [ ] **Step 4: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add index.html src/index.css
git commit -m "feat: configure dark theme with custom design tokens"
```

---

## Task 5: Environment files and type declarations

**Files:**
- Create: `.env`
- Create: `.env.example`
- Create: `src/vite-env.d.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Create .env**

```bash
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://cutjwwnwfyfidkxqgjdk.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dGp3d253ZnlmaWRreHFnamRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MDEwOTksImV4cCI6MjA5NzA3NzA5OX0.1qZua5N3y2F9DQ3ohJqvY35cyO1CKicR0MQrWtuNC04
VITE_ALLOWED_EMAIL=guilhermegranja.dev@gmail.com
EOF
```

- [ ] **Step 2: Create .env.example**

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ALLOWED_EMAIL=
```

- [ ] **Step 3: Ensure .env is in .gitignore**

Check if `.gitignore` already has `.env`. If not, add it:
```bash
echo ".env" >> .gitignore
```

- [ ] **Step 4: Create src/vite-env.d.ts**

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_ALLOWED_EMAIL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 5: Commit**

```bash
git add .env.example src/vite-env.d.ts .gitignore
git commit -m "chore: add environment variable declarations and example file"
```

---

## Task 6: Core types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Create src/types/index.ts**

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

export interface GoalWithProgress extends Goal {
  actual: number
  progress: number
}
```

- [ ] **Step 2: Verify zero type errors**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add core TypeScript types"
```

---

## Task 7: Core lib — Supabase client and formatters

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/formatters.ts`

- [ ] **Step 1: Create src/lib/supabase.ts**

```ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

- [ ] **Step 2: Create src/lib/formatters.ts**

```ts
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value)
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'dd/MM/yyyy')
}

export function formatMonth(dateStr: string): string {
  return format(parseISO(dateStr), 'MMMM yyyy', { locale: ptBR })
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
```

- [ ] **Step 3: Verify zero type errors**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase.ts src/lib/formatters.ts
git commit -m "feat: add Supabase client and date/currency formatters"
```

---

## Task 8: Auth hook with AuthProvider and useAuth

**Files:**
- Create: `src/hooks/useAuth.ts`

- [ ] **Step 1: Create src/hooks/useAuth.ts**

```ts
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  loading: boolean
  signInWithGithub: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const handleUser = (u: User | null) => {
    if (u && u.email !== import.meta.env.VITE_ALLOWED_EMAIL) {
      supabase.auth.signOut()
      setUser(null)
    } else {
      setUser(u)
    }
    setLoading(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGithub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/lab-financial-management/auth/callback`,
      },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGithub, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

- [ ] **Step 2: Verify zero type errors**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useAuth.ts
git commit -m "feat: add AuthProvider context and useAuth hook"
```

---

## Task 9: Router, PrivateRoute, and main entry point

**Files:**
- Create: `src/router/index.tsx`
- Modify: `src/main.tsx`
- Delete or empty: `src/App.tsx` (not needed)

- [ ] **Step 1: Create src/router/index.tsx**

```tsx
import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { PageWrapper } from '@/components/layout/PageWrapper'
import Login from '@/pages/Login'
import AuthCallback from '@/pages/AuthCallback'
import Dashboard from '@/pages/Dashboard'
import Transactions from '@/pages/Transactions'
import Categories from '@/pages/Categories'
import Reports from '@/pages/Reports'
import Goals from '@/pages/Goals'

function PrivateRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f1117]">
        <p className="text-slate-400">Carregando...</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return (
    <PageWrapper>
      <Outlet />
    </PageWrapper>
  )
}

export const router = createBrowserRouter(
  [
    { path: '/login', element: <Login /> },
    { path: '/auth/callback', element: <AuthCallback /> },
    {
      element: <PrivateRoute />,
      children: [
        { path: '/', element: <Dashboard /> },
        { path: '/transactions', element: <Transactions /> },
        { path: '/categories', element: <Categories /> },
        { path: '/reports', element: <Reports /> },
        { path: '/goals', element: <Goals /> },
      ],
    },
  ],
  { basename: '/lab-financial-management' }
)
```

**Note:** All page imports will cause TypeScript errors until pages are created. That is expected at this step.

- [ ] **Step 2: Update src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { router } from '@/router'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
)
```

- [ ] **Step 3: Remove or stub App.tsx**

The scaffold creates `src/App.tsx`. Either delete it or replace with an empty export since it is no longer used:

```bash
rm src/App.tsx src/assets/react.svg
```

- [ ] **Step 4: Create placeholder stub files so tsc can resolve imports**

Create minimal stubs — each page will be properly implemented in later tasks:

```bash
mkdir -p src/pages src/components/layout

for page in Dashboard Transactions Categories Reports Goals Login AuthCallback; do
  echo "export default function ${page}() { return null }" > src/pages/${page}.tsx
done

echo "export function PageWrapper({ children }: { children: React.ReactNode }) { return <>{children}</> }" > src/components/layout/PageWrapper.tsx
```

Add `import React from 'react'` to PageWrapper.tsx if needed:
```ts
import React from 'react'
export function PageWrapper({ children }: { children: React.ReactNode }) { return <>{children}</> }
```

- [ ] **Step 5: Verify TypeScript compiles with zero errors**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Start dev server and confirm app loads (blank page OK)**

```bash
npm run dev
```

Open http://localhost:5173/lab-financial-management/ in browser. Should load without JS errors. Then stop with Ctrl+C.

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: add router with PrivateRoute, AuthProvider wired in main.tsx"
```

---

## Task 10: Layout components — Sidebar, Header, PageWrapper

**Files:**
- Modify: `src/components/layout/PageWrapper.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/Header.tsx`

- [ ] **Step 1: Create src/components/layout/Sidebar.tsx**

```tsx
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Tag,
  BarChart2,
  Target,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transações', icon: ArrowLeftRight },
  { to: '/categories', label: 'Categorias', icon: Tag },
  { to: '/reports', label: 'Relatórios', icon: BarChart2 },
  { to: '/goals', label: 'Metas', icon: Target },
]

interface SidebarProps {
  onClose?: () => void
}

function NavItems({ onClose }: SidebarProps) {
  return (
    <nav className="flex flex-col gap-1 p-4">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#2d3148]'
            )
          }
        >
          <Icon size={18} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function Sidebar() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      {/* Mobile hamburger */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden text-slate-400"
        onClick={() => setDrawerOpen(true)}
      >
        <Menu size={20} />
      </Button>

      {/* Mobile overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 z-50 bg-[#1a1d27] border-r border-[#2d3148] transition-transform duration-200 md:hidden',
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#2d3148]">
          <span className="text-white font-semibold">Finanças</span>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-400"
            onClick={() => setDrawerOpen(false)}
          >
            <X size={18} />
          </Button>
        </div>
        <NavItems onClose={() => setDrawerOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-[#1a1d27] border-r border-[#2d3148] fixed top-0 left-0 h-full">
        <div className="p-6 border-b border-[#2d3148]">
          <span className="text-white font-bold text-lg">💰 Finanças</span>
        </div>
        <NavItems />
      </aside>
    </>
  )
}
```

- [ ] **Step 2: Create src/components/layout/Header.tsx**

```tsx
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  const { signOut } = useAuth()

  return (
    <header className="h-16 border-b border-[#2d3148] flex items-center justify-between px-6 bg-[#1a1d27]">
      <h1 className="text-white font-semibold text-lg">{title}</h1>
      <Button
        variant="ghost"
        size="sm"
        onClick={signOut}
        className="text-slate-400 hover:text-slate-200 gap-2"
      >
        <LogOut size={16} />
        Sair
      </Button>
    </header>
  )
}
```

- [ ] **Step 3: Replace src/components/layout/PageWrapper.tsx**

```tsx
import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/transactions': 'Transações',
  '/categories': 'Categorias',
  '/reports': 'Relatórios',
  '/goals': 'Metas',
}

interface PageWrapperProps {
  children: ReactNode
}

export function PageWrapper({ children }: PageWrapperProps) {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'Dashboard'

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <Sidebar />
      <div className="md:ml-64 flex flex-col min-h-screen">
        <Header title={title} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify zero type errors**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/
git commit -m "feat: add Sidebar, Header, and PageWrapper layout components"
```

---

## Task 11: Login and AuthCallback pages

**Files:**
- Modify: `src/pages/Login.tsx`
- Modify: `src/pages/AuthCallback.tsx`

- [ ] **Step 1: Write src/pages/Login.tsx**

```tsx
import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Github } from 'lucide-react'

export default function Login() {
  const { user, loading, signInWithGithub } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true })
    }
  }, [user, loading, navigate])

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <div className="bg-[#1a1d27] border border-[#2d3148] rounded-xl p-10 flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="text-center">
          <div className="text-5xl mb-3">💰</div>
          <h1 className="text-white text-2xl font-bold">Lab Finanças</h1>
          <p className="text-slate-400 text-sm mt-1">Controle financeiro pessoal</p>
        </div>

        {error === 'unauthorized' && (
          <div className="w-full bg-red-950 border border-red-800 text-red-400 text-sm rounded-lg px-4 py-3">
            Acesso não autorizado. Use a conta correta.
          </div>
        )}

        <Button
          onClick={signInWithGithub}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
          disabled={loading}
        >
          <Github size={18} />
          Entrar com GitHub
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write src/pages/AuthCallback.tsx**

```tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export default function AuthCallback() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading) {
      if (user) {
        navigate('/', { replace: true })
      } else {
        navigate('/login?error=unauthorized', { replace: true })
      }
    }
  }, [user, loading, navigate])

  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <p className="text-slate-400">Autenticando...</p>
    </div>
  )
}
```

- [ ] **Step 3: Verify zero type errors**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/Login.tsx src/pages/AuthCallback.tsx
git commit -m "feat: add Login and AuthCallback pages"
```

---

## Task 12: Data hooks — useTransactions, useCategories, useGoals

**Files:**
- Create: `src/hooks/useTransactions.ts`
- Create: `src/hooks/useCategories.ts`
- Create: `src/hooks/useGoals.ts`

- [ ] **Step 1: Create src/hooks/useTransactions.ts**

```ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Transaction, TransactionType } from '@/types'

export interface TransactionFilters {
  period: string        // 'YYYY-MM' or 'YYYY'
  periodType: 'monthly' | 'yearly'
  type: TransactionType | 'all'
  categoryId: string    // uuid or 'all'
}

const PAGE_SIZE = 20

export function useTransactions(filters: TransactionFilters) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const from = (page - 1) * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    const datePattern =
      filters.periodType === 'monthly'
        ? `${filters.period}-%`
        : `${filters.period}%`

    let query = supabase
      .from('transactions')
      .select('*, categories(*)', { count: 'exact' })
      .like('date', datePattern)
      .order('date', { ascending: false })
      .range(from, to)

    if (filters.type !== 'all') {
      query = query.eq('type', filters.type)
    }
    if (filters.categoryId !== 'all') {
      query = query.eq('category_id', filters.categoryId)
    }

    const { data, error: err, count } = await query

    if (err) {
      setError(err.message)
    } else {
      setTransactions((data as Transaction[]) ?? [])
      setTotal(count ?? 0)
    }

    setLoading(false)
  }, [filters, page])

  useEffect(() => {
    fetch()
  }, [fetch])

  const createTransaction = async (
    payload: Omit<Transaction, 'id' | 'created_at' | 'categories'>
  ) => {
    const { error: err } = await supabase.from('transactions').insert(payload)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateTransaction = async (
    id: string,
    payload: Partial<Omit<Transaction, 'id' | 'created_at' | 'categories'>>
  ) => {
    const { error: err } = await supabase
      .from('transactions')
      .update(payload)
      .eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const deleteTransaction = async (id: string) => {
    const { error: err } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return {
    transactions,
    total,
    totalPages,
    page,
    setPage,
    loading,
    error,
    refresh: fetch,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  }
}
```

- [ ] **Step 2: Create src/hooks/useCategories.ts**

```ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Category, CategoryType } from '@/types'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (err) {
      setError(err.message)
    } else {
      setCategories((data as Category[]) ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const createCategory = async (payload: {
    name: string
    color: string
    icon: string
    type: CategoryType
  }) => {
    const { error: err } = await supabase.from('categories').insert(payload)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateCategory = async (
    id: string,
    payload: Partial<{ name: string; color: string; icon: string; type: CategoryType }>
  ) => {
    const { error: err } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const deleteCategory = async (id: string) => {
    const { error: err } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  return {
    categories,
    loading,
    error,
    refresh: fetch,
    createCategory,
    updateCategory,
    deleteCategory,
  }
}
```

- [ ] **Step 3: Create src/hooks/useGoals.ts**

```ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Goal, GoalWithProgress, PeriodType } from '@/types'

export function useGoals() {
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)

    const { data: goalsData, error: goalsErr } = await supabase
      .from('goals')
      .select('*, categories(*)')
      .order('created_at', { ascending: false })

    if (goalsErr) {
      setError(goalsErr.message)
      setLoading(false)
      return
    }

    const rawGoals = (goalsData as Goal[]) ?? []

    const withProgress = await Promise.all(
      rawGoals.map(async (goal) => {
        const datePattern =
          goal.period_type === 'monthly'
            ? `${goal.period_start}-%`
            : `${goal.period_start.slice(0, 4)}%`

        const { data: txData } = await supabase
          .from('transactions')
          .select('amount')
          .eq('category_id', goal.category_id)
          .eq('type', 'expense')
          .like('date', datePattern)

        const actual = (txData ?? []).reduce((sum, tx) => sum + (tx.amount as number), 0)
        const progress = goal.amount > 0 ? (actual / goal.amount) * 100 : 0

        return { ...goal, actual, progress }
      })
    )

    setGoals(withProgress)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
  }, [fetch])

  const createGoal = async (payload: {
    category_id: string
    amount: number
    period_type: PeriodType
    period_start: string
  }) => {
    const { error: err } = await supabase.from('goals').insert(payload)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const updateGoal = async (
    id: string,
    payload: Partial<{
      category_id: string
      amount: number
      period_type: PeriodType
      period_start: string
    }>
  ) => {
    const { error: err } = await supabase
      .from('goals')
      .update(payload)
      .eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  const deleteGoal = async (id: string) => {
    const { error: err } = await supabase.from('goals').delete().eq('id', id)
    if (err) throw new Error(err.message)
    await fetch()
  }

  return {
    goals,
    loading,
    error,
    refresh: fetch,
    createGoal,
    updateGoal,
    deleteGoal,
  }
}
```

- [ ] **Step 4: Verify zero type errors**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/
git commit -m "feat: add useTransactions, useCategories, useGoals data hooks"
```

---

## Task 13: Chart wrapper components

**Files:**
- Create: `src/components/charts/BalanceLineChart.tsx`
- Create: `src/components/charts/ExpensePieChart.tsx`
- Create: `src/components/charts/MonthlyBarChart.tsx`

- [ ] **Step 1: Create src/components/charts/BalanceLineChart.tsx**

```tsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/formatters'

export interface BalanceDataPoint {
  month: string   // e.g. "Jan/25"
  balance: number
}

interface Props {
  data: BalanceDataPoint[]
}

export function BalanceLineChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
        <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 8 }}
          labelStyle={{ color: '#e2e8f0' }}
          formatter={(value: number) => [formatCurrency(value), 'Saldo']}
        />
        <Line
          type="monotone"
          dataKey="balance"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ fill: '#6366f1', r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Create src/components/charts/ExpensePieChart.tsx**

```tsx
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/formatters'

export interface PieDataPoint {
  name: string
  value: number
  color: string
}

interface Props {
  data: PieDataPoint[]
}

export function ExpensePieChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
        Sem despesas no período
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 8 }}
          labelStyle={{ color: '#e2e8f0' }}
          formatter={(value: number) => [formatCurrency(value)]}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 3: Create src/components/charts/MonthlyBarChart.tsx**

```tsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/formatters'

export interface MonthlyDataPoint {
  month: string
  receitas: number
  despesas: number
}

interface Props {
  data: MonthlyDataPoint[]
}

export function MonthlyBarChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d3148" />
        <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{ background: '#1a1d27', border: '1px solid #2d3148', borderRadius: 8 }}
          labelStyle={{ color: '#e2e8f0' }}
          formatter={(value: number, name: string) => [
            formatCurrency(value),
            name === 'receitas' ? 'Receitas' : 'Despesas',
          ]}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: '#94a3b8', fontSize: 12 }}>
              {value === 'receitas' ? 'Receitas' : 'Despesas'}
            </span>
          )}
        />
        <Bar dataKey="receitas" fill="#22c55e" radius={[3, 3, 0, 0]} />
        <Bar dataKey="despesas" fill="#ef4444" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 4: Verify zero type errors**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/charts/
git commit -m "feat: add BalanceLineChart, ExpensePieChart, MonthlyBarChart components"
```

---

## Task 14: Dashboard page

**Files:**
- Modify: `src/pages/Dashboard.tsx`

- [ ] **Step 1: Write src/pages/Dashboard.tsx**

```tsx
import { useEffect, useState } from 'react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { Transaction, Category } from '@/types'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { BalanceLineChart, BalanceDataPoint } from '@/components/charts/BalanceLineChart'
import { ExpensePieChart, PieDataPoint } from '@/components/charts/ExpensePieChart'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'

interface MonthSummary {
  income: number
  expenses: number
  balance: number
}

export default function Dashboard() {
  const [summary, setSummary] = useState<MonthSummary>({ income: 0, expenses: 0, balance: 0 })
  const [lineData, setLineData] = useState<BalanceDataPoint[]>([])
  const [pieData, setPieData] = useState<PieDataPoint[]>([])
  const [recentTx, setRecentTx] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const now = new Date()
      const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')
      const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd')

      const [summaryRes, pieRes, recentRes, historyData] = await Promise.all([
        // Current month totals
        supabase
          .from('transactions')
          .select('amount, type')
          .gte('date', monthStart)
          .lte('date', monthEnd),

        // Expenses by category this month
        supabase
          .from('transactions')
          .select('amount, categories(name, color)')
          .eq('type', 'expense')
          .gte('date', monthStart)
          .lte('date', monthEnd),

        // 5 most recent transactions
        supabase
          .from('transactions')
          .select('*, categories(*)')
          .order('date', { ascending: false })
          .limit(5),

        // Last 6 months history
        Promise.all(
          Array.from({ length: 6 }, (_, i) => {
            const d = subMonths(now, 5 - i)
            const start = format(startOfMonth(d), 'yyyy-MM-dd')
            const end = format(endOfMonth(d), 'yyyy-MM-dd')
            return supabase
              .from('transactions')
              .select('amount, type')
              .gte('date', start)
              .lte('date', end)
              .then(({ data }) => ({
                month: format(d, 'MMM/yy', { locale: ptBR }),
                data: data ?? [],
              }))
          })
        ),
      ])

      // Summary
      const txs = summaryRes.data ?? []
      const income = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const expenses = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
      setSummary({ income, expenses, balance: income - expenses })

      // Pie chart — group by category
      const catMap: Record<string, { name: string; color: string; total: number }> = {}
      for (const tx of pieRes.data ?? []) {
        const cat = tx.categories as unknown as Category | null
        const key = cat?.name ?? 'Sem categoria'
        if (!catMap[key]) catMap[key] = { name: key, color: cat?.color ?? '#6366f1', total: 0 }
        catMap[key].total += tx.amount
      }
      setPieData(Object.values(catMap).map((c) => ({ name: c.name, value: c.total, color: c.color })))

      // Recent transactions
      setRecentTx((recentRes.data as Transaction[]) ?? [])

      // Line chart
      setLineData(
        historyData.map(({ month, data }) => {
          const inc = data.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
          const exp = data.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
          return { month, balance: inc - exp }
        })
      )

      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return <div className="text-slate-400 text-sm">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Receitas do mês</CardTitle>
            <TrendingUp size={16} className="text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-500">{formatCurrency(summary.income)}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Despesas do mês</CardTitle>
            <TrendingDown size={16} className="text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-500">{formatCurrency(summary.expenses)}</p>
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-slate-400 text-sm font-medium">Saldo do mês</CardTitle>
            <Wallet size={16} className="text-indigo-400" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(summary.balance)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader>
            <CardTitle className="text-slate-200 text-sm font-medium">Saldo — últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <BalanceLineChart data={lineData} />
          </CardContent>
        </Card>

        <Card className="bg-[#1a1d27] border-[#2d3148]">
          <CardHeader>
            <CardTitle className="text-slate-200 text-sm font-medium">Despesas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpensePieChart data={pieData} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="bg-[#1a1d27] border-[#2d3148]">
        <CardHeader>
          <CardTitle className="text-slate-200 text-sm font-medium">Transações recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#2d3148] hover:bg-transparent">
                <TableHead className="text-slate-400">Data</TableHead>
                <TableHead className="text-slate-400">Descrição</TableHead>
                <TableHead className="text-slate-400">Categoria</TableHead>
                <TableHead className="text-slate-400">Tipo</TableHead>
                <TableHead className="text-slate-400 text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTx.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                    Nenhuma transação encontrada
                  </TableCell>
                </TableRow>
              )}
              {recentTx.map((tx) => (
                <TableRow key={tx.id} className="border-[#2d3148]">
                  <TableCell className="text-slate-300">{formatDate(tx.date)}</TableCell>
                  <TableCell className="text-slate-300">{tx.description ?? '—'}</TableCell>
                  <TableCell className="text-slate-300">
                    {tx.categories ? (
                      <span className="flex items-center gap-1.5">
                        <span>{tx.categories.icon}</span>
                        {tx.categories.name}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={tx.type === 'income'
                        ? 'bg-green-950 text-green-400 border-green-800'
                        : 'bg-red-950 text-red-400 border-red-800'
                      }
                      variant="outline"
                    >
                      {tx.type === 'income' ? 'Receita' : 'Despesa'}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-medium ${tx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Verify zero type errors**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "feat: add Dashboard page with summary cards and charts"
```

---

## Task 15: Transactions page

**Files:**
- Modify: `src/pages/Transactions.tsx`

- [ ] **Step 1: Write src/pages/Transactions.tsx**

```tsx
import { useState } from 'react'
import { format } from 'date-fns'
import { useTransactions, TransactionFilters } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { Transaction, TransactionType } from '@/types'
import { formatCurrency, formatDate } from '@/lib/formatters'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'

const CURRENT_MONTH = format(new Date(), 'yyyy-MM')

interface FormState {
  amount: string
  type: TransactionType
  category_id: string
  description: string
  date: string
}

const EMPTY_FORM: FormState = {
  amount: '',
  type: 'expense',
  category_id: '',
  description: '',
  date: format(new Date(), 'yyyy-MM-dd'),
}

export default function Transactions() {
  const [filters, setFilters] = useState<TransactionFilters>({
    period: CURRENT_MONTH,
    periodType: 'monthly',
    type: 'all',
    categoryId: 'all',
  })

  const { transactions, totalPages, page, setPage, loading, createTransaction, updateTransaction, deleteTransaction } =
    useTransactions(filters)
  const { categories } = useCategories()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(tx: Transaction) {
    setForm({
      amount: String(tx.amount),
      type: tx.type,
      category_id: tx.category_id ?? '',
      description: tx.description ?? '',
      date: tx.date,
    })
    setEditingId(tx.id)
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.amount || isNaN(Number(form.amount))) {
      setFormError('Informe um valor válido')
      return
    }
    if (!form.date) {
      setFormError('Informe a data')
      return
    }

    setSaving(true)
    setFormError(null)

    const payload = {
      amount: parseFloat(form.amount),
      type: form.type,
      category_id: form.category_id || null,
      description: form.description || null,
      date: form.date,
    }

    try {
      if (editingId) {
        await updateTransaction(editingId, payload)
      } else {
        await createTransaction(payload)
      }
      setDialogOpen(false)
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteTransaction(deleteId)
    } finally {
      setDeleteId(null)
    }
  }

  const availableCategories = categories.filter(
    (c) => c.type === form.type || c.type === 'both'
  )

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-slate-400 text-xs">Período</Label>
          <Input
            type="month"
            value={filters.period}
            onChange={(e) =>
              setFilters((f) => ({ ...f, period: e.target.value, periodType: 'monthly' }))
            }
            className="bg-[#1a1d27] border-[#2d3148] text-slate-200 w-40"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-slate-400 text-xs">Tipo</Label>
          <Select
            value={filters.type}
            onValueChange={(v) => setFilters((f) => ({ ...f, type: v as TransactionType | 'all' }))}
          >
            <SelectTrigger className="bg-[#1a1d27] border-[#2d3148] text-slate-200 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label className="text-slate-400 text-xs">Categoria</Label>
          <Select
            value={filters.categoryId}
            onValueChange={(v) => setFilters((f) => ({ ...f, categoryId: v }))}
          >
            <SelectTrigger className="bg-[#1a1d27] border-[#2d3148] text-slate-200 w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={openCreate} className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus size={16} />
          Nova transação
        </Button>
      </div>

      {/* Table */}
      <div className="bg-[#1a1d27] border border-[#2d3148] rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[#2d3148] hover:bg-transparent">
              <TableHead className="text-slate-400">Data</TableHead>
              <TableHead className="text-slate-400">Descrição</TableHead>
              <TableHead className="text-slate-400">Categoria</TableHead>
              <TableHead className="text-slate-400">Tipo</TableHead>
              <TableHead className="text-slate-400 text-right">Valor</TableHead>
              <TableHead className="text-slate-400 w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!loading && transactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                  Nenhuma transação encontrada
                </TableCell>
              </TableRow>
            )}
            {transactions.map((tx) => (
              <TableRow key={tx.id} className="border-[#2d3148] hover:bg-[#2d3148]/30">
                <TableCell className="text-slate-300">{formatDate(tx.date)}</TableCell>
                <TableCell className="text-slate-300">{tx.description ?? '—'}</TableCell>
                <TableCell className="text-slate-300">
                  {tx.categories ? `${tx.categories.icon} ${tx.categories.name}` : '—'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      tx.type === 'income'
                        ? 'bg-green-950 text-green-400 border-green-800'
                        : 'bg-red-950 text-red-400 border-red-800'
                    }
                  >
                    {tx.type === 'income' ? 'Receita' : 'Despesa'}
                  </Badge>
                </TableCell>
                <TableCell className={`text-right font-medium ${tx.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-slate-200" onClick={() => openEdit(tx)}>
                      <Pencil size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-400" onClick={() => setDeleteId(tx.id)}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="text-slate-400"
          >
            <ChevronLeft size={16} />
          </Button>
          <span className="text-slate-400 text-sm">{page} / {totalPages}</span>
          <Button
            variant="ghost"
            size="icon"
            disabled={page === totalPages}
            onClick={() => setPage(page + 1)}
            className="text-slate-400"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar transação' : 'Nova transação'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && (
              <p className="text-red-400 text-sm">{formError}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as TransactionType, category_id: '' }))}>
                  <SelectTrigger className="bg-[#0f1117] border-[#2d3148]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
                    <SelectItem value="income">Receita</SelectItem>
                    <SelectItem value="expense">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Valor (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="bg-[#0f1117] border-[#2d3148]"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Data</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="bg-[#0f1117] border-[#2d3148]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Categoria</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}>
                <SelectTrigger className="bg-[#0f1117] border-[#2d3148]">
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
                  {availableCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Descrição</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="bg-[#0f1117] border-[#2d3148]"
                placeholder="Opcional"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>Excluir transação</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">Essa ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="text-slate-400">
              Cancelar
            </Button>
            <Button onClick={handleDelete} className="bg-red-700 hover:bg-red-800 text-white">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Verify zero type errors**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Transactions.tsx
git commit -m "feat: add Transactions page with CRUD, filters, and pagination"
```

---

## Task 16: Categories page

**Files:**
- Modify: `src/pages/Categories.tsx`

- [ ] **Step 1: Write src/pages/Categories.tsx**

```tsx
import { useState } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { Category, CategoryType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Pencil, Trash2 } from 'lucide-react'

const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  income: 'Receita',
  expense: 'Despesa',
  both: 'Ambos',
}

const CATEGORY_TYPE_COLORS: Record<CategoryType, string> = {
  income: 'bg-green-950 text-green-400 border-green-800',
  expense: 'bg-red-950 text-red-400 border-red-800',
  both: 'bg-indigo-950 text-indigo-400 border-indigo-800',
}

interface FormState {
  name: string
  icon: string
  color: string
  type: CategoryType
}

const EMPTY_FORM: FormState = { name: '', icon: '📦', color: '#6366f1', type: 'expense' }

export default function Categories() {
  const { categories, loading, createCategory, updateCategory, deleteCategory } = useCategories()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(cat: Category) {
    setForm({ name: cat.name, icon: cat.icon, color: cat.color, type: cat.type })
    setEditingId(cat.id)
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setFormError('Informe o nome da categoria')
      return
    }
    if (!form.icon.trim()) {
      setFormError('Informe um ícone (emoji)')
      return
    }

    setSaving(true)
    setFormError(null)

    try {
      if (editingId) {
        await updateCategory(editingId, form)
      } else {
        await createCategory(form)
      }
      setDialogOpen(false)
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteCategory(deleteId)
    } finally {
      setDeleteId(null)
    }
  }

  if (loading) return <div className="text-slate-400 text-sm">Carregando...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus size={16} />
          Nova categoria
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <Card key={cat.id} className="bg-[#1a1d27] border-[#2d3148]">
            <CardContent className="p-4 flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: cat.color + '33', border: `1px solid ${cat.color}44` }}
              >
                {cat.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 font-medium text-sm truncate">{cat.name}</p>
                <Badge variant="outline" className={`text-xs mt-1 ${CATEGORY_TYPE_COLORS[cat.type]}`}>
                  {CATEGORY_TYPE_LABELS[cat.type]}
                </Badge>
              </div>
              <div className="flex flex-col gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-slate-200"
                  onClick={() => openEdit(cat)}
                >
                  <Pencil size={13} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:text-red-400"
                  onClick={() => setDeleteId(cat.id)}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {categories.length === 0 && (
          <div className="col-span-full text-center text-slate-500 py-12">
            Nenhuma categoria cadastrada
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && <p className="text-red-400 text-sm">{formError}</p>}

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-[#0f1117] border-[#2d3148]"
                placeholder="Ex: Alimentação"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Ícone (emoji)</Label>
                <Input
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  className="bg-[#0f1117] border-[#2d3148] text-xl"
                  placeholder="🍕"
                  maxLength={2}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Cor</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="h-9 w-9 rounded border-0 cursor-pointer bg-transparent"
                  />
                  <Input
                    value={form.color}
                    onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                    className="bg-[#0f1117] border-[#2d3148] font-mono text-sm"
                    placeholder="#6366f1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as CategoryType }))}>
                <SelectTrigger className="bg-[#0f1117] border-[#2d3148]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="both">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>Excluir categoria</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">
            Essa ação não pode ser desfeita. Transações vinculadas perderão a categoria.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="text-slate-400">
              Cancelar
            </Button>
            <Button onClick={handleDelete} className="bg-red-700 hover:bg-red-800 text-white">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Verify zero type errors**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Categories.tsx
git commit -m "feat: add Categories page with grid and CRUD dialogs"
```

---

## Task 17: Reports page

**Files:**
- Modify: `src/pages/Reports.tsx`

- [ ] **Step 1: Write src/pages/Reports.tsx**

```tsx
import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useCategories } from '@/hooks/useCategories'
import { Category } from '@/types'
import { formatCurrency } from '@/lib/formatters'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { MonthlyBarChart, MonthlyDataPoint } from '@/components/charts/MonthlyBarChart'
import { Download } from 'lucide-react'

interface CategoryRow {
  name: string
  icon: string
  total: number
  percent: number
  type: 'income' | 'expense'
}

function buildMonthOptions() {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, i)
    return {
      value: format(d, 'yyyy-MM'),
      label: format(d, 'MMMM yyyy', { locale: ptBR }),
    }
  })
}

export default function Reports() {
  const MONTH_OPTIONS = buildMonthOptions()
  const [selectedMonth, setSelectedMonth] = useState(MONTH_OPTIONS[0].value)
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([])
  const [barData, setBarData] = useState<MonthlyDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const { categories } = useCategories()

  useEffect(() => {
    async function load() {
      setLoading(true)
      const now = new Date()

      // Monthly summary for selected month
      const [year, month] = selectedMonth.split('-')
      const start = `${year}-${month}-01`
      const refDate = new Date(Number(year), Number(month) - 1, 1)
      const end = format(endOfMonth(refDate), 'yyyy-MM-dd')

      const { data: txData } = await supabase
        .from('transactions')
        .select('amount, type, category_id, categories(name, icon, color)')
        .gte('date', start)
        .lte('date', end)

      const txs = txData ?? []
      const totalIncome = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
      const totalExpense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

      const catMap: Record<string, CategoryRow> = {}
      for (const tx of txs) {
        const cat = tx.categories as unknown as Category | null
        const key = tx.category_id ?? '__none__'
        if (!catMap[key]) {
          catMap[key] = {
            name: cat?.name ?? 'Sem categoria',
            icon: cat?.icon ?? '❓',
            total: 0,
            percent: 0,
            type: tx.type as 'income' | 'expense',
          }
        }
        catMap[key].total += tx.amount
      }

      const grandTotal = totalIncome + totalExpense || 1
      const rows = Object.values(catMap).map((r) => ({
        ...r,
        percent: (r.total / grandTotal) * 100,
      }))
      rows.sort((a, b) => b.total - a.total)
      setCategoryRows(rows)

      // Bar chart — last 6 months
      const monthsData = await Promise.all(
        Array.from({ length: 6 }, (_, i) => {
          const d = subMonths(now, 5 - i)
          const s = format(startOfMonth(d), 'yyyy-MM-dd')
          const e = format(endOfMonth(d), 'yyyy-MM-dd')
          return supabase
            .from('transactions')
            .select('amount, type')
            .gte('date', s)
            .lte('date', e)
            .then(({ data }) => ({
              month: format(d, 'MMM/yy', { locale: ptBR }),
              receitas: (data ?? []).filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
              despesas: (data ?? []).filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
            }))
        })
      )
      setBarData(monthsData)
      setLoading(false)
    }

    load()
  }, [selectedMonth, categories])

  function exportCSV() {
    const header = 'Categoria,Tipo,Total,Percentual'
    const rows = categoryRows.map(
      (r) =>
        `"${r.icon} ${r.name}","${r.type === 'income' ? 'Receita' : 'Despesa'}","${r.total.toFixed(2)}","${r.percent.toFixed(1)}%"`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `relatorio-${selectedMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label className="text-slate-400 text-xs">Mês</Label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="bg-[#1a1d27] border-[#2d3148] text-slate-200 w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
              {MONTH_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value} className="capitalize">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={exportCSV} className="border-[#2d3148] text-slate-400 hover:text-slate-200 gap-2">
          <Download size={15} />
          Exportar CSV
        </Button>
      </div>

      <Tabs defaultValue="summary">
        <TabsList className="bg-[#1a1d27] border border-[#2d3148]">
          <TabsTrigger value="summary" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
            Resumo
          </TabsTrigger>
          <TabsTrigger value="chart" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-slate-400">
            Gráfico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card className="bg-[#1a1d27] border-[#2d3148]">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2d3148] hover:bg-transparent">
                    <TableHead className="text-slate-400">Categoria</TableHead>
                    <TableHead className="text-slate-400">Tipo</TableHead>
                    <TableHead className="text-slate-400 text-right">Total</TableHead>
                    <TableHead className="text-slate-400 text-right">% do total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  )}
                  {!loading && categoryRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500 py-8">
                        Nenhum dado no período
                      </TableCell>
                    </TableRow>
                  )}
                  {categoryRows.map((row, i) => (
                    <TableRow key={i} className="border-[#2d3148]">
                      <TableCell className="text-slate-300">
                        {row.icon} {row.name}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {row.type === 'income' ? 'Receita' : 'Despesa'}
                      </TableCell>
                      <TableCell className={`text-right font-medium ${row.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                        {formatCurrency(row.total)}
                      </TableCell>
                      <TableCell className="text-right text-slate-400">
                        {row.percent.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart">
          <Card className="bg-[#1a1d27] border-[#2d3148]">
            <CardHeader>
              <CardTitle className="text-slate-200 text-sm font-medium">
                Receitas vs Despesas — últimos 6 meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyBarChart data={barData} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: Verify zero type errors**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Reports.tsx
git commit -m "feat: add Reports page with summary table, bar chart, and CSV export"
```

---

## Task 18: Goals page

**Files:**
- Modify: `src/pages/Goals.tsx`

- [ ] **Step 1: Write src/pages/Goals.tsx**

```tsx
import { useState } from 'react'
import { format } from 'date-fns'
import { useGoals } from '@/hooks/useGoals'
import { useCategories } from '@/hooks/useCategories'
import { GoalWithProgress, PeriodType } from '@/types'
import { formatCurrency } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface FormState {
  category_id: string
  amount: string
  period_type: PeriodType
  period_start: string
}

const EMPTY_FORM: FormState = {
  category_id: '',
  amount: '',
  period_type: 'monthly',
  period_start: format(new Date(), 'yyyy-MM'),
}

function progressColor(progress: number): string {
  if (progress >= 100) return 'bg-red-500'
  if (progress >= 80) return 'bg-yellow-500'
  return 'bg-indigo-500'
}

export default function Goals() {
  const { goals, loading, createGoal, updateGoal, deleteGoal } = useGoals()
  const { categories } = useCategories()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function openCreate() {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError(null)
    setDialogOpen(true)
  }

  function openEdit(goal: GoalWithProgress) {
    setForm({
      category_id: goal.category_id,
      amount: String(goal.amount),
      period_type: goal.period_type,
      period_start: goal.period_start,
    })
    setEditingId(goal.id)
    setFormError(null)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.category_id) {
      setFormError('Selecione uma categoria')
      return
    }
    if (!form.amount || isNaN(Number(form.amount))) {
      setFormError('Informe um valor válido')
      return
    }
    if (!form.period_start) {
      setFormError('Informe o período')
      return
    }

    setSaving(true)
    setFormError(null)

    const payload = {
      category_id: form.category_id,
      amount: parseFloat(form.amount),
      period_type: form.period_type,
      period_start: form.period_start,
    }

    try {
      if (editingId) {
        await updateGoal(editingId, payload)
      } else {
        await createGoal(payload)
      }
      setDialogOpen(false)
    } catch (e) {
      setFormError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteGoal(deleteId)
    } finally {
      setDeleteId(null)
    }
  }

  if (loading) return <div className="text-slate-400 text-sm">Carregando...</div>

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
          <Plus size={16} />
          Nova meta
        </Button>
      </div>

      <div className="space-y-3">
        {goals.length === 0 && (
          <div className="text-center text-slate-500 py-12">Nenhuma meta cadastrada</div>
        )}

        {goals.map((goal) => {
          const cat = goal.categories
          const pct = Math.min(goal.progress, 100)

          return (
            <Card key={goal.id} className="bg-[#1a1d27] border-[#2d3148]">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                      style={{
                        backgroundColor: (cat?.color ?? '#6366f1') + '33',
                        border: `1px solid ${(cat?.color ?? '#6366f1')}44`,
                      }}
                    >
                      {cat?.icon ?? '🎯'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-slate-200 font-medium text-sm truncate">
                          {cat?.name ?? 'Categoria'}
                        </p>
                        {goal.progress >= 100 && (
                          <Badge variant="outline" className="bg-red-950 text-red-400 border-red-800 text-xs">
                            Excedido
                          </Badge>
                        )}
                        {goal.progress >= 80 && goal.progress < 100 && (
                          <Badge variant="outline" className="bg-yellow-950 text-yellow-400 border-yellow-800 text-xs">
                            Atenção
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="h-2 w-full bg-[#2d3148] rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full transition-all', progressColor(goal.progress))}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{formatCurrency(goal.actual)} gastos</span>
                          <span>
                            {goal.progress.toFixed(0)}% de {formatCurrency(goal.amount)}
                          </span>
                        </div>
                      </div>

                      <p className="text-slate-500 text-xs mt-1">
                        {goal.period_type === 'monthly' ? 'Mensal' : 'Anual'} · {goal.period_start}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-slate-200"
                      onClick={() => openEdit(goal)}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-400"
                      onClick={() => setDeleteId(goal.id)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar meta' : 'Nova meta'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && <p className="text-red-400 text-sm">{formError}</p>}

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Categoria</Label>
              <Select value={form.category_id} onValueChange={(v) => setForm((f) => ({ ...f, category_id: v }))}>
                <SelectTrigger className="bg-[#0f1117] border-[#2d3148]">
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
                  {categories
                    .filter((c) => c.type === 'expense' || c.type === 'both')
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Valor limite (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="bg-[#0f1117] border-[#2d3148]"
                placeholder="0,00"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Tipo de período</Label>
                <Select value={form.period_type} onValueChange={(v) => setForm((f) => ({ ...f, period_type: v as PeriodType }))}>
                  <SelectTrigger className="bg-[#0f1117] border-[#2d3148]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1d27] border-[#2d3148]">
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-slate-400 text-xs">Início do período</Label>
                <Input
                  type="month"
                  value={form.period_start}
                  onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))}
                  className="bg-[#0f1117] border-[#2d3148]"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-slate-400">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="bg-[#1a1d27] border-[#2d3148] text-slate-200">
          <DialogHeader>
            <DialogTitle>Excluir meta</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm">Essa ação não pode ser desfeita.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)} className="text-slate-400">
              Cancelar
            </Button>
            <Button onClick={handleDelete} className="bg-red-700 hover:bg-red-800 text-white">
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 2: Verify zero type errors**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Goals.tsx
git commit -m "feat: add Goals page with progress bars and CRUD dialogs"
```

---

## Task 19: Final validation and deploy

**Files:**
- No new files

- [ ] **Step 1: Full TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors. If errors exist, fix them before continuing.

- [ ] **Step 2: Start dev server and test all routes**

```bash
npm run dev
```

Manually verify each route:
- `/lab-financial-management/login` → login screen appears with GitHub button
- `/lab-financial-management/` → redirect to login (not authenticated yet)
- After login → Dashboard loads with cards (may show R$ 0,00 if no data yet)
- `/transactions` → table with filters and "Nova transação" button
- `/categories` → grid of category cards (seed data should appear)
- `/reports` → tabs with table and chart
- `/goals` → list (empty or with existing goals)
- Mobile viewport: sidebar collapsed, hamburger button visible

Stop with Ctrl+C.

- [ ] **Step 3: Production build**

```bash
npm run build
```

Expected: `dist/` folder created with no build errors.

- [ ] **Step 4: Preview production build locally**

```bash
npm run preview
```

Open http://localhost:4173/lab-financial-management/ — verify app loads.

Stop with Ctrl+C.

- [ ] **Step 5: Deploy to GitHub Pages**

```bash
npm run deploy
```

Expected: `Published` message. The app is live at:
`https://guilherme-granja.github.io/lab-financial-management/`

- [ ] **Step 6: Configure GitHub Pages source (one-time)**

In the GitHub repo settings → Pages → Source: set to `gh-pages` branch, root `/`.

- [ ] **Step 7: Final commit (if any uncommitted changes remain)**

```bash
git status
git add -A
git commit -m "chore: final cleanup and deploy"
```

---

## Self-Review Checklist

- [x] **Scaffold + deps** → Task 1
- [x] **vite.config.ts** (base, alias, tailwind plugin) → Task 2
- [x] **shadcn init + all 11 components** → Task 3
- [x] **Dark theme (`class="dark"` + CSS variable overrides)** → Task 4
- [x] **.env + .env.example + vite-env.d.ts** → Task 5
- [x] **Types** (Category, Transaction, Goal, GoalWithProgress) → Task 6
- [x] **supabase.ts + formatters.ts** → Task 7
- [x] **useAuth (AuthProvider + useAuth hook)** → Task 8
- [x] **Router + PrivateRoute + main.tsx** → Task 9
- [x] **Sidebar + Header + PageWrapper** → Task 10
- [x] **Login + AuthCallback** → Task 11
- [x] **useTransactions + useCategories + useGoals** → Task 12
- [x] **BalanceLineChart + ExpensePieChart + MonthlyBarChart** → Task 13
- [x] **Dashboard (summary cards + line + pie + recent table)** → Task 14
- [x] **Transactions (filters + table + CRUD + pagination 20/page)** → Task 15
- [x] **Categories (grid + CRUD + color picker + confirm delete)** → Task 16
- [x] **Reports (tabs + summary table + bar chart + CSV export)** → Task 17
- [x] **Goals (progress bars + badges 80%/100% + CRUD)** → Task 18
- [x] **Build + gh-pages deploy** → Task 19
- [x] **UI em português brasileiro** → all pages
- [x] **`tsc --noEmit` after each page** → each task step 2
- [x] **Commits por feature** → each task
- [x] **No `any` types** → all hooks and pages use proper types
- [x] **GoalWithProgress type referenced in Goals page** → defined in Task 6, used in Task 18
- [x] **`formatCurrency`, `formatDate`, `formatMonth`** → defined Task 7, used in pages
- [x] **`cn()` from lib/utils** → used in Sidebar and Goals
- [x] **GitHub OAuth redirect URL** includes `/lab-financial-management/auth/callback` → Task 8
- [x] **basename `/lab-financial-management`** in createBrowserRouter → Task 9
