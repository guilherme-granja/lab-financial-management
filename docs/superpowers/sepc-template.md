# SPEC — [Nome da Feature]

**Data:** YYYY-MM-DD
**Arquivos afetados:** lista exata de arquivos que serão tocados
**Não tocar em:** lista de arquivos relacionados que NÃO devem ser alterados

---

## Contexto

2-3 frases explicando o estado atual do código e o que está faltando.
Não descrever o que vai ser feito — isso vai nas tasks. Apenas o ponto de partida.

---

## Task 1 — [Nome curto]

**Arquivo:** `src/caminho/exato/Arquivo.ts`

O que fazer, direto ao ponto. Se for adicionar uma função, incluir a assinatura completa.
Se for modificar algo existente, indicar o trecho aproximado ("na linha ~45" ou "dentro da função `handleSave`").

```ts
// Código de referência quando necessário
// Não precisa ser o código final — é o contrato que o agente deve seguir
```

Restrições específicas desta task (ex: "não reescrever o hook inteiro", "usar o padrão já existente no arquivo").

---

## Task 2 — [Nome curto]

**Arquivo:** `src/caminho/exato/Outro.tsx`

Mesma estrutura. Uma task por arquivo sempre que possível.

Se a task tocar dois arquivos inseparáveis (ex: hook + página que dependem um do outro), agrupá-los numa task só e listar os dois arquivos.

---

## Task N — Migration (quando houver)

**Arquivo:** `supabase/migrations/YYYYMMDDHHMMSS_nome_descritivo.sql`

Criar o arquivo com o conteúdo abaixo e aplicar com `npx supabase db push` antes de prosseguir para as próximas tasks.

```sql
-- SQL aqui
```

> Migrations sempre como primeira task quando existirem.

---

## Checklist

- [ ] Task 1 concluída
- [ ] Task 2 concluída
- [ ] `tsc --noEmit` — zero erros
- [ ] `git commit -m "feat|fix|chore: descrição"`
- [ ] `git push origin main && npm run deploy`

---

<!--
GUIA DE USO — remover antes de salvar a spec real

QUANDO CRIAR SPEC:
- Feature que toca mais de 2 arquivos
- Qualquer mudança que envolva migration de banco
- Feature nova com lógica não trivial

QUANDO NÃO CRIAR SPEC (usar prompt direto no Claude Code ou Claude.ai):
- Bugfix em arquivo único e causa óbvia
- Ajuste de UI pontual (cor, texto, label)
- Renomear variável ou função
- Corrigir tipo TypeScript

TAMANHO IDEAL:
- 1 spec = 1 feature
- Máximo 5 tasks por spec
- Se passar de 5 tasks, dividir em duas specs

MIGRATION:
- Sempre primeira task
- Nunca hardcodar UUIDs — usar SELECT por name quando precisar referenciar registros existentes
- Confirmar `npx supabase db push` antes de prosseguir
-->