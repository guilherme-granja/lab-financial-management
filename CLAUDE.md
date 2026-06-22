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

## Arquitetura — leitura obrigatória antes de qualquer implementação

Antes de criar ou modificar qualquer arquivo em `src/`, ler:

```
docs/superpowers/architecture.md
```

Este documento define as camadas da aplicação, a regra de isolamento do Supabase, a estrutura obrigatória de hooks e as convenções de tipos.

**Regra inviolável:** `supabase` nunca é importado em `src/pages/` nem em `src/components/`. Toda query vai em `src/hooks/`. Violações bloqueiam o commit.

---

## Convenções do projeto

- Componentes em PascalCase, arquivos em kebab-case
- Componentes novos: consultar `.claude/skills/frontend-design/SKILL.md` para tokens de cor, padrões de Card/Dialog/Grid e checklist de entrega
- Estados obrigatórios em toda operação Supabase: `loading`, `error`, `empty` em queries; `saving`, `formError` em mutações
- Chamadas ao Supabase centralizadas em hooks — nunca diretamente em páginas ou componentes de UI
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

- **Arquitetura (leitura obrigatória):** `docs/superpowers/architecture.md`
- Critérios de review: `.claude/code-review-spec.md`
- Padrões de UI/design: `.claude/skills/frontend-design/`
- Documentação do projeto: `docs/superpowers/`

## Versionamento

A versão do projeto vive em `package.json` → campo `"version"`. Ela é a única fonte da verdade.

### Quando atualizar

| Tipo de mudança | Ação |
|---|---|
| Feature nova (nova tela, nova funcionalidade, novo campo visível) | Incrementar **minor**: `1.0.0 → 1.1.0` |
| Bugfix (corrigir comportamento incorreto, ajuste de UI, refactor sem nova funcionalidade) | Incrementar **patch**: `1.0.0 → 1.0.1` |

### Como atualizar

Antes do `git commit` final de cada spec/bugfix, editar `package.json` e incrementar a versão conforme a tabela acima.

### Fluxo de deploy com tag

Após o commit e push de uma mudança, criar uma tag Git anotada com a versão e enviá-la ao GitHub:

```bash
git tag -a v<VERSÃO> -m "v<VERSÃO>"
git push origin v<VERSÃO>
```

Exemplo para a versão `1.1.0`:
```bash
git tag -a v1.1.0 -m "v1.1.0"
git push origin v1.1.0
```

As tags ficam visíveis em `https://github.com/guilherme-granja/lab-financial-management/tags` e permitem rollback via `git checkout v<VERSÃO>`.

---

## MCP Superpowers
- Nunca usar a skill writing-plans — specs em docs/superpowers/specs/ já definem o plano
- Usar subagent-driven-development para execução das tasks
- Spec review: executar apenas em tasks marcadas com `Review: sim` na spec