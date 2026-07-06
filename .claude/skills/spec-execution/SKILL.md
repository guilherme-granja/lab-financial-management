---
description: Executa specs do Lab Finanças a partir de docs/superpowers/specs/to_implement/, garantindo que o contexto do plano correspondente (docs/superpowers/plans/) seja lido antes de começar, que as regras da spec (Não tocar em, flags de Review, ordem de dependência entre specs, decisão de push) sejam seguidas à risca, e que a spec seja movida para docs/superpowers/specs/implemented/ ao final.
when_to_use: Disparar sempre que o usuário pedir para executar, rodar, aplicar ou implementar uma spec — seja citando um caminho em docs/superpowers/specs/to_implement/, colando o conteúdo de uma spec, ou dizendo algo como "roda a spec 1.B" / "implementa essa spec".
---

# Spec Execution Skill

## Estrutura de pastas de specs

```
docs/superpowers/specs/
  to_implement/   # specs prontas pra rodar, ainda não executadas
  implemented/    # specs já executadas — histórico, não tocar
```

Specs a executar sempre vêm de `to_implement/`. Nunca ler ou assumir uma spec de dentro de `implemented/` como pendente — se o usuário pedir pra rodar algo que já está lá, avisar que ela já consta como implementada e confirmar antes de repetir qualquer task.

## Passo 0 — Encontrar o plano por trás da spec

Toda spec em `docs/superpowers/specs/to_implement/` pode pertencer a um plano maior em `docs/superpowers/plans/`. Antes de tocar em qualquer arquivo de código:

1. Ler o cabeçalho da spec inteiro (Data, Arquivos afetados, Não tocar em, Modelo, Paralelismo, Pré-requisito).
2. Se o cabeçalho ou o nome do arquivo sugerir que a spec faz parte de uma etapa numerada (ex: "1.A", "1.B", "Pré-requisito: Spec 1.A"), procurar em `docs/superpowers/plans/` por um documento da mesma data ou tema que dê o contexto mais amplo (roadmap completo, decisões de arquitetura, o porquê da divisão em specs).
3. Ler esse plano antes de começar — ele explica o "porquê", a spec só descreve o "o quê".
4. Se não existir nenhum plano relacionado, seguir direto com a spec — nem toda spec pertence a uma etapa maior.

## Passo 1 — Checar dependência entre specs

Se a spec tiver um campo **Pré-requisito**, verificar se ele já foi cumprido antes de começar (arquivos/funções citados já devem existir no código, e a spec pré-requisito já deve estar em `implemented/`). Se não estiver, parar e avisar o usuário — não seguir tentando adivinhar ou recriar o que faltou.

## Passo 2 — Executar task por task

- Seguir a ordem das tasks como estão numeradas, salvo indicação explícita de paralelismo no cabeçalho.
- Ler o arquivo real antes de editar — o código nas tasks é contrato/referência, não a implementação final.
- Respeitar **Não tocar em** literalmente — nenhuma edição fora do que a spec autoriza, mesmo que pareça relacionado.
- Marcar cada task como concluída no checklist ao final da spec conforme avança.

## Passo 3 — Flags de Review

- `> Review: não` — pode prosseguir e commitar sem pausa extra.
- `> Review: sim` — parar após implementar a task, mostrar um resumo do diff e a razão de risco (lógica de negócio, decisão de arquitetura, etc.), e aguardar aprovação antes de seguir para a próxima task ou commitar.

Isso é adicional ao Code Review obrigatório já definido em `CLAUDE.md`/`.claude/code-review-spec.md` antes de qualquer `git commit`/`git push` — não substitui esse processo, só adiciona um checkpoint task a task para as mais arriscadas.

## Passo 4 — Checklist final da spec

- Rodar todos os itens do checklist da spec (`tsc --noEmit`, `npx vitest run`, etc.) exatamente como descritos.
- Se a spec tiver uma seção "Observação sobre deploy" ou instrução explícita de **não** fazer push (comum em specs intermediárias de uma etapa maior, ex: 1.A e 1.B do roadmap multi-tenant), respeitar isso mesmo que `tsc`/testes passem — só a spec final da etapa autoriza o push.
- Se a spec autorizar o push, seguir o Code Review obrigatório do `CLAUDE.md` antes de `git commit`/`git push`.

## Passo 5 — Mover a spec para implemented/

Depois que todos os itens do checklist da spec passarem (independente de a spec autorizar push ou não — "executada" significa código aplicado e validado, não necessariamente publicado):

```bash
git mv docs/superpowers/specs/to_implement/<nome-da-spec>.md docs/superpowers/specs/implemented/<nome-da-spec>.md
```

Incluir esse `git mv` no mesmo commit da task final da spec (não criar um commit separado só pra isso). Se a spec instruir a não fazer push, o commit com a spec movida também fica local, aguardando o push autorizado por uma spec posterior da mesma etapa.

## Passo 2.1 — RLS: proibido subquery recursiva

Antes de aplicar qualquer migration que crie/altere policy de RLS: nunca fazer subquery em tabela X dentro de uma policy da própria tabela X (caso mais comum: checagem de admin em `profiles`). Causa recursão infinita no Postgres — a policy chama a subquery, que reavalia a policy, indefinidamente — retorna null/erro e quebra checagens tipo `profile?.is_active` para todo mundo, silenciosamente (não aparece em `tsc` nem testes unitários).

❌ Errado:
```sql
CREATE POLICY "..." ON profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));
```

✅ Correto — usar função `SECURITY DEFINER` (bypassa RLS, sem recursão):
```sql
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
$$;

CREATE POLICY "..." ON profiles FOR SELECT USING (public.current_user_is_admin());
```

`public.current_user_is_admin()` já existe no chore (`skfhscsbjeoogfeelirb`) desde a migration `20260706120000_admin_read_all_policies.sql`. Em banco pessoal sem essa função, criar antes de usar. Regra geral vale pra qualquer tabela X, não só `profiles`.

Checklist antes de commitar migration de RLS:
- [ ] Nenhuma policy em tabela X faz subquery direta em X
- [ ] Policies de admin usam `public.current_user_is_admin()` (ou criar equivalente se não existir no banco alvo)
- [ ] Testar login de usuário normal E admin após aplicar — `tsc`/testes não pegam esse bug

## Convenção de nomenclatura do projeto

- `docs/superpowers/plans/YYYY-MM-DD-nome.md` — visão ampla, roadmap, decisões de arquitetura, não executável diretamente.
- `docs/superpowers/specs/to_implement/YYYY-MM-DD-o-que-a-spec-faz.md` — unidade executável, com tasks e checklist, pendente.
- `docs/superpowers/specs/implemented/YYYY-MM-DD-o-que-a-spec-faz.md` — mesma spec, já executada e movida ao final do Passo 5.
