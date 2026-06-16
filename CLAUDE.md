# CLAUDE.md

## Approach

- Read existing files before writing. Don't re-read unless changed.
- Thorough in reasoning, concise in output.
- Skip files over 100KB unless required.
- No sycophantic openers or closing fluff.
- No emojis or em-dashes.
- Do not guess APIs, versions, flags, commit SHAs, or package names. Verify by reading code or docs before asserting.

---

## Stack

- **Framework:** React 19 + TypeScript 6 + Vite 8
- **Estilos:** Tailwind CSS 4
- **UI:** Radix UI primitives + shadcn/ui + lucide-react
- **Gráficos:** recharts
- **Backend:** Supabase (auth, database, realtime, storage)
- **Roteamento:** react-router-dom v7
- **Deploy:** gh-pages

---

## Convenções do projeto

- Componentes em PascalCase, arquivos em kebab-case
- Componentes novos: consultar `.claude/skills/frontend-design/SKILL.md` para tokens de cor, padrões de Card/Dialog/Grid e checklist de entrega
- Estados obrigatórios em toda operação Supabase: `loading`, `error`, `empty` em queries; `saving`, `formError` em mutações
- Chamadas ao Supabase centralizadas em hooks ou services — nunca diretamente em componentes de UI
- Sem `any` em TypeScript — use tipos específicos ou `unknown`
- Imports organizados: externos → internos → tipos

---

## Code Review

Executar apenas quando o usuário disser "review" ou "faz o review".

```
1. git diff --name-only para identificar arquivos alterados
2. Ler cada arquivo alterado
3. Aplicar critérios em .claude/code-review-spec.md
4. Apresentar relatório ao usuário
5. Aguardar aprovação antes de commitar
```

---

## Referências internas

- Critérios de review: `.claude/code-review-spec.md`
- Padrões de UI/design: `.claude/skills/frontend-design/`
- Documentação do projeto: `docs/superpowers/`

## MCP Superpowers
- Nunca usar a skill writing-plans — specs em docs/superpowers/specs/ já definem o plano
- Usar subagent-driven-development para execução das tasks
- Spec review: executar apenas em tasks marcadas com `Review: sim` na spec