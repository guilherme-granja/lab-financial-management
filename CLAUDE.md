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
- Usar sempre a skill `.claude/skills/frontend-design` ao criar ou editar componentes
- Estados obrigatórios em toda operação Supabase: `loading`, `success`, `error`
- Chamadas ao Supabase centralizadas em hooks ou services — nunca diretamente em componentes de UI
- Sem `any` em TypeScript — use tipos específicos ou `unknown`
- Imports organizados: externos → internos → tipos

---

## Fluxo obrigatório ao finalizar qualquer task

Antes de executar `git commit` ou `git push`, execute o **Code Review automático** de tudo que foi alterado.

```
1. Identificar os arquivos modificados na task atual via: git diff --name-only
2. Ler cada arquivo alterado
3. Executar o Code Review seguindo a spec em: .claude/code-review-spec.md
4. Apresentar o relatório completo ao usuário
5. Aguardar aprovação ou corrigir os problemas apontados
6. Somente após aprovação: git add → git commit → git push
```

> NUNCA pule o Code Review. Se o usuário pedir para commitar diretamente, informe que o
> processo exige o review primeiro e pergunte se deseja prosseguir mesmo assim.

---

## Referências internas

- Critérios de review: `.claude/code-review-spec.md`
- Padrões de UI/design: `.claude/skills/frontend-design/`
- Documentação do projeto: `docs/superpowers/`