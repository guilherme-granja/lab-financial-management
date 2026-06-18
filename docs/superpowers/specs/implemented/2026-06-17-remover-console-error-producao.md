# SPEC — Remover console.error em produção

**Data:** 2026-06-17
**Arquivos afetados:**
- `src/pages/Login.tsx`
- `src/hooks/useDuplicateCheck.ts`

**Não tocar em:**
- `src/hooks/useAuth.tsx`
- Qualquer outro arquivo

**Modelo:** Sonnet padrão

**Paralelismo:** Tasks 1 e 2 podem rodar em paralelo (arquivos distintos, sem dependência).

---

## Contexto

`Login.tsx` e `useDuplicateCheck.ts` usam `console.error` diretamente em produção. Isso expõe mensagens internas do Supabase Auth (como códigos de erro e nomes de endpoints) via DevTools, o que pode facilitar enumeração de usuários e revelar detalhes da infraestrutura.

---

## Task 1 — Guardar console.error no Login com flag de DEV

**Arquivo:** `src/pages/Login.tsx`
> Review: não

Há dois `console.error` no arquivo, dentro dos blocos `catch` de `handleSignIn` (linha ~49) e `handleVerify` (linha ~69). Substituir ambos por:

```ts
if (import.meta.env.DEV) console.error('[Login] ...', msg)
```

Manter as mensagens de texto originais e o prefixo `[Login]`. Apenas adicionar o guard `if (import.meta.env.DEV)`.

Restrições:
- Não alterar o fluxo de tratamento de erros ao redor dos `console.error`
- Não remover as mensagens de erro amigáveis exibidas ao usuário — apenas o log interno

---

## Task 2 — Guardar console.error em useDuplicateCheck com flag de DEV

**Arquivo:** `src/hooks/useDuplicateCheck.ts`
> Review: não

Há um `console.error` na linha ~31, dentro do bloco `if (error)`. Substituir por:

```ts
if (import.meta.env.DEV) console.error('[checkDuplicate]', error.message)
```

Restrições:
- Não alterar o resto da função `checkDuplicate`

---

## Checklist

- [ ] Task 1 concluída
- [ ] Task 2 concluída
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "chore: remover console.error em producao"`
- [ ] `git push origin main && npm run deploy`
