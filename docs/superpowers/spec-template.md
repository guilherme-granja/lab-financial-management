# SPEC — [Nome da Feature]

**Data:** YYYY-MM-DD
**Arquivos afetados:** lista exata de arquivos que serão tocados
**Não tocar em:** lista de arquivos relacionados que NÃO devem ser alterados
**Modelo:** Sonnet 4.6 High | Sonnet padrão
**Paralelismo:** Tasks N e M podem rodar em paralelo (arquivos distintos, sem dependência entre si) — omitir se todas forem sequenciais

---

## Contexto

2-3 frases explicando o estado atual do código e o que está faltando.
Não descrever o que vai ser feito — isso vai nas tasks. Apenas o ponto de partida.

---

## Task 1 — Migration (quando houver — sempre primeira, sempre sequencial)

**Arquivo:** `supabase/migrations/YYYYMMDDHHMMSS_nome_descritivo.sql`
> Review: não

Criar o arquivo com o conteúdo abaixo e aplicar com `npx supabase db push` antes de prosseguir.

```sql
-- SQL aqui
-- Nunca hardcodar UUIDs — usar SELECT por name quando referenciar registros existentes
```

---

## Task 2 — [Nome curto]

**Arquivo:** `src/caminho/exato/Arquivo.ts`
> Review: não

O que fazer, direto ao ponto. Se for adicionar uma função, incluir a assinatura completa.
Se for modificar algo existente, indicar o trecho aproximado ("na linha ~45" ou "dentro da função `handleSave`").

```ts
// Código de referência quando necessário
// Não precisa ser o código final — é o contrato que o agente deve seguir
```

Restrições específicas desta task (ex: "não reescrever o hook inteiro", "usar o padrão já existente no arquivo").

---

## Task 3 — [Nome curto]

**Arquivo:** `src/caminho/exato/Outro.tsx`
> Review: sim

Mesma estrutura. Uma task por arquivo sempre que possível.

Se a task tocar dois arquivos inseparáveis (ex: hook + página que dependem um do outro), agrupá-los numa task só e listar os dois arquivos.

---

## Checklist

- [ ] Task 1 concluída
- [ ] Task 2 concluída
- [ ] Task 3 concluída
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat|fix|chore: descrição"`
- [ ] `git push origin main && npm run deploy`

---

<!--
GUIA DE USO — remover antes de salvar a spec real

NOME DO ARQUIVO:
- Formato obrigatório: `YYYY-MM-DD-o-que-a-spec-faz.md`
- Exemplos: `2026-06-17-filtro-conta-chips-transacoes.md`, `2026-06-17-dashboard-graficos.md`
- Usar kebab-case, sem acentos, sem maiúsculas
- Salvar em: `docs/superpowers/specs/`

QUANDO CRIAR SPEC:
- Feature que toca mais de 2 arquivos
- Qualquer mudança que envolva migration de banco
- Feature nova com lógica não trivial

QUANDO NÃO CRIAR SPEC (usar prompt direto no Claude Code):
- Bugfix em arquivo único e causa óbvia
- Ajuste de UI pontual (cor, texto, label)
- Renomear variável ou função
- Corrigir tipo TypeScript

TAMANHO IDEAL:
- 1 spec = 1 feature
- Máximo 5 tasks por spec
- Se passar de 5 tasks, dividir em duas specs

MODELO:
- Sonnet 4.6 High: feature com múltiplos arquivos, migration, decisões de arquitetura
- Sonnet padrão: scaffold puro copiando padrão existente (novo hook igual a um existente, nova rota, nova página seguindo layout já existente)

REVIEW POR TASK — regra:
> Review: não → migration SQL, types, deploy, scaffold simples
> Review: sim  → páginas com lógica (hooks complexos, forms, filtros, lógica de negócio)

PARALELISMO — quando anotar:
- Anotar apenas quando duas ou mais tasks não compartilham arquivos E não têm dependência de output entre si
- Tasks que tocam o mesmo arquivo: sempre sequenciais
- Task de migration: sempre sequencial e sempre primeira
- Exemplo válido: "Tasks 3 e 4 podem rodar em paralelo" quando Task 3 = novo componente isolado, Task 4 = novo hook isolado
- Exemplo inválido: Task 3 cria hook, Task 4 usa o hook criado na Task 3 — dependência de output, sequencial

ECONOMIA DE TOKENS — princípios para escrever tasks:
- Código de referência serve como contrato, não como implementação completa; o agente lê o arquivo real antes de escrever
- Não repetir JSX já existente no arquivo — indicar "copiar o conteúdo existente dentro desta condicional"
- Não descrever o que o código faz linha a linha — descrever apenas o que muda e onde
- Preferir "substituir X por Y" a reescrever blocos inteiros
- Quando o padrão já existe no arquivo (ex: outro Dialog com mesmo comportamento), escrever "seguir o padrão do Dialog de exclusão na linha ~396" em vez de colar o JSX completo

RESTRIÇÕES TRANSVERSAIS — colocar em "Não tocar em", não repetir dentro de cada task:
- Hooks, tipos, banco de dados que não fazem parte da feature
- Lógica de negócio de outras features no mesmo arquivo
- Arquivos de configuração (vite, tsconfig, tailwind)

QUANDO O AGENTE VAI LER O ARQUIVO DE QUALQUER FORMA:
- Não colar trechos longos do arquivo atual na spec — o agente lê o arquivo antes de editar
- Incluir código de referência apenas para: assinaturas de função nova, contratos de tipo novo, ou padrão que não existe ainda no projeto
-->