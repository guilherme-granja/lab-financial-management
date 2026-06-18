# SPEC — Content Security Policy (CSP) via meta tag

**Data:** 2026-06-17
**Arquivos afetados:**
- `index.html`

**Não tocar em:**
- `public/404.html`
- `vite.config.ts`
- Qualquer arquivo em `src/`

**Modelo:** Sonnet padrão

---

## Contexto

O `index.html` não define nenhuma Content Security Policy. A ausência de CSP significa que, se um XSS for injetado, o script malicioso tem acesso irrestrito ao DOM e ao token Supabase em memória. O `index.html` já possui um script inline (workaround de SPA para GitHub Pages) que precisa ser permitido via hash ou `unsafe-inline`.

---

## Task 1 — Adicionar meta tag de CSP no `index.html`

**Arquivo:** `index.html`
> Review: não

Adicionar a meta tag abaixo imediatamente após `<meta charset="UTF-8" />` e antes do script inline existente:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  img-src 'self' data:;
  font-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self'
">
```

Justificativa das diretivas:
- `script-src 'unsafe-inline'` — necessário pelo script inline de redirect do GitHub Pages já existente no `index.html`. Sem isso, o workaround de SPA quebra.
- `connect-src *.supabase.co` — permite as chamadas da Supabase JS lib (REST + WebSocket).
- `frame-ancestors 'none'` — previne clickjacking.
- `base-uri 'self'` — previne injeção de base tag.
- `form-action 'self'` — restringe destino de submits de formulário.

Restrições:
- Não alterar o script inline existente de redirect
- Não adicionar origens além das listadas sem justificativa
- A meta tag deve ficar dentro de `<head>`, antes de qualquer `<script>`

---

## Checklist

- [ ] Task 1 concluída
- [ ] Verificar no browser: DevTools → Network → nenhuma requisição bloqueada em uso normal
- [ ] Verificar: login, navegação entre páginas, carregamento de dados funcionam normalmente
- [ ] `git commit -m "chore: adicionar Content Security Policy via meta tag"`
- [ ] `git push origin main && npm run deploy`
