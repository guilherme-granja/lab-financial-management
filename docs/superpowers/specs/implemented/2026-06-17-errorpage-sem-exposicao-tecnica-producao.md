# SPEC — ErrorPage sem exposição de detalhes técnicos em produção

**Data:** 2026-06-17
**Arquivos afetados:**
- `src/pages/ErrorPage.tsx`

**Não tocar em:**
- `src/router/index.tsx`
- Nenhum outro arquivo

**Modelo:** Sonnet padrão

---

## Contexto

`ErrorPage.tsx` renderiza `error.message` ou `error.statusText` em um `<pre>` visível ao usuário final. Em produção, isso pode expor stack traces, nomes de tabelas, mensagens internas do Supabase ou detalhes de rotas. Em desenvolvimento, o detalhe técnico é útil para debug.

---

## Task 1 — Condicionar exibição do erro ao ambiente

**Arquivo:** `src/pages/ErrorPage.tsx`
> Review: não

Substituir o bloco `<pre>` atual por lógica condicional baseada em `import.meta.env.DEV`:

```tsx
{import.meta.env.DEV && message && (
  <pre className="text-xs text-slate-500 bg-[#1a1d27] rounded p-3 max-h-32 overflow-y-auto w-full max-w-md">
    {message}
  </pre>
)}
```

Em produção (`import.meta.env.PROD`), o `<pre>` não renderiza — o usuário vê apenas o título "Algo deu errado" e o parágrafo descritivo já existente.

Restrições:
- Não alterar o restante do JSX (título, parágrafo, botões de navegação)
- Não remover a variável `message` — ela ainda é usada no bloco de DEV
- Não alterar o `useRouteError` nem o cast de tipo

---

## Checklist

- [ ] Task 1 concluída
- [ ] Verificar: em DEV o `<pre>` aparece; em PROD não aparece (simular com `import.meta.env.DEV = false` ou build de produção)
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "fix: ocultar detalhes de erro tecnico em producao"`
- [ ] `git push origin main && npm run deploy`
