## Approach
- Read existing files before writing. Don't re-read unless changed.
- Thorough in reasoning, concise in output.
- Skip files over 100KB unless required.
- No sycophantic openers or closing fluff.
- No emojis or em-dashes.
- Do not guess APIs, versions, flags, commit SHAs, or package names. Verify by reading code or docs before asserting.

## Stack
- React + TypeScript
- Tailwind CSS
- Supabase (auth, database, realtime, storage)

## Convenções de UI
- Usar sempre a skill /frontend-design ao criar ou editar componentes
- Estados obrigatórios em toda operação Supabase: loading, success, error
- Componentes em PascalCase, ficheiros em kebab-case

## Fluxo obrigatório ao finalizar qualquer task
 
Antes de executar `git commit` ou `git push`, você **deve** realizar o **Code Review automático** de tudo que foi alterado nessa task.
 
### Passo a passo obrigatório
 
```
1. Identificar todos os arquivos modificados na task atual
2. Executar o Code Review completo seguindo a spec em .claude/code-review-spec.md
3. Apresentar o relatório de review ao usuário
4. Aguardar aprovação ou aplicar correções apontadas
5. Somente após aprovação: executar git add → git commit → git push
```
 
> ⚠️ **Nunca pule o Code Review.** Se o usuário pedir para commitar diretamente sem review,
> informe que o processo exige o review primeiro e pergunte se quer prosseguir mesmo assim.
 
---
 
## Stack do projeto
 
- **Framework:** React com TypeScript
- **Linguagem:** TypeScript (strict mode)
- **Estilo:** [ajuste conforme seu projeto: Tailwind / Styled Components / CSS Modules]
- **Testes:** [ajuste conforme seu projeto: Vitest / Jest / Testing Library]
---
 
## Referências
 
- Critérios de review detalhados: `.claude/code-review-spec.md`
- Para dúvidas sobre padrões do projeto, consulte os arquivos em `docs/`