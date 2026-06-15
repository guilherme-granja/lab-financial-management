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