# SPEC — UI Global: Fonte Inter + Sair na Sidebar

**Data:** 2026-06-18
**Arquivos afetados:** `index.html` · `src/index.css` · `src/components/layout/Sidebar.tsx` · `src/components/layout/Header.tsx`
**Não tocar em:** `src/hooks/useAuth.tsx` · `src/components/layout/PageWrapper.tsx` · qualquer página em `src/pages/`
**Modelo:** Sonnet padrão
**Paralelismo:** Tasks 1 e 2 podem rodar em paralelo (arquivos distintos, sem dependência entre si). Task 3 depende da Task 2 (remove import de useAuth do Header).

---

## Contexto

O projeto usa `system-ui` como fonte e não carrega nenhuma fonte externa. O botão "Sair" vive no `Header.tsx` e aparece no topo direito de todas as telas — some em mobile quando o header não tem espaço. A `Sidebar.tsx` não tem rodapé nem ação de logout.

---

## Task 1 — Fonte Inter

**Arquivos:** `index.html` · `src/index.css`
> Review: não

**index.html** — adicionar dois `<link>` de pré-conexão e carregamento da Inter antes do `<link rel="icon">`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

O `Content-Security-Policy` existente restringe `font-src 'self'`. É necessário ampliar para permitir Google Fonts. Substituir a diretiva `font-src` e adicionar `style-src` para sheets do Google:

```
font-src 'self' https://fonts.gstatic.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
```

**src/index.css** — substituir a declaração `font-family` no seletor `body`:

```css
font-family: 'Inter', system-ui, -apple-system, sans-serif;
```

Não alterar nenhuma outra regra do arquivo.

---

## Task 2 — Sair no rodapé da Sidebar

**Arquivo:** `src/components/layout/Sidebar.tsx`
> Review: sim

Adicionar o botão "Sair" no rodapé de ambas as versões da sidebar (desktop e mobile drawer). O botão deve chamar `signOut` do `useAuth`.

Imports a adicionar no topo do arquivo:
```ts
import { useAuth } from '@/hooks/useAuth'
import { LogOut } from 'lucide-react'
```

Criar um componente interno `SidebarFooter` (ou inline) que renderiza:
```tsx
<div className="border-t border-[#2d3148] p-4 mt-auto">
  <button
    onClick={signOut}
    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium
               text-slate-500 hover:text-slate-300 hover:bg-[#2d3148] transition-colors"
  >
    <LogOut size={18} />
    Sair
  </button>
</div>
```

Posicionar esse bloco:
- No **desktop sidebar**: após `<NavItems />`, dentro do `<aside className="hidden md:flex flex-col ...">`. O aside já tem `flex flex-col` — o `mt-auto` do wrapper interno vai empurrar o botão para o rodapé.
- No **mobile drawer**: após `<NavItems onClose={...} />`, dentro do `<aside>` do drawer. Ao clicar, também fechar o drawer (`setDrawerOpen(false)`) além de chamar `signOut`.

O `useAuth()` deve ser chamado dentro do componente `Sidebar` (não dentro de `NavItems`, que não tem acesso ao contexto de autenticação atualmente).

---

## Task 3 — Header simplificado

**Arquivo:** `src/components/layout/Header.tsx`
> Review: não

Remover o botão "Sair" e seus imports relacionados. O Header passa a exibir apenas o título da página.

Resultado esperado do arquivo após a mudança:

```tsx
interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="h-16 border-b border-[#2d3148] flex items-center px-6 bg-[#1a1d27]">
      <h1 className="text-white font-semibold text-lg">{title}</h1>
    </header>
  )
}
```

Remover os imports de `useAuth`, `Button` e `LogOut` que ficarem sem uso.

---

## Checklist

- [ ] Task 1 concluída
- [ ] Task 2 concluída
- [ ] Task 3 concluída
- [ ] `tsc --noEmit` — zero erros
- [ ] Verificar no browser: fonte Inter carregando, botão Sair visível no rodapé da sidebar em desktop e mobile
- [ ] `git commit -m "chore: fonte Inter, botão Sair movido para sidebar"`
- [ ] `git push origin main && npm run deploy`
