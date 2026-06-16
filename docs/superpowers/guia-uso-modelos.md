# Guia — Qual modelo usar por tipo de tarefa

---

## Claude Code — Sonnet 4.6 High

Usar quando a task exige raciocínio sobre múltiplos arquivos, decisões de arquitetura ou implementação de spec completa.

Exemplos:
- Implementar uma Spec nova (feature com hook + página + migration)
- Refatorar uma estrutura que afeta vários arquivos
- Resolver um bug cuja causa raiz não é óbvia
- Criar um sistema novo do zero seguindo padrões do projeto

---

## Claude Code — Sonnet padrão (sem High)

Trocar o modelo antes de mandar quando a task é scaffold puro — o agente só precisa copiar um padrão existente, sem raciocinar sobre arquitetura.

Exemplos:
- Criar um hook novo igual ao `useAccounts.ts` (mesmo padrão, entidade diferente)
- Adicionar uma rota nova em `router/index.tsx`
- Criar uma página nova que segue o layout exato das outras
- Adicionar um campo novo num formulário existente

Como trocar: no Claude Code, antes de enviar o prompt, selecionar o modelo Sonnet 4.6 (sem High).

---

## Subagentes (Haiku) — não mexer

O Claude Code já escala automaticamente para Haiku em subtasks simples: buscar arquivo, rodar comando, verificar tipo, ler migration. Esse comportamento é correto e esperado. Não tente interferir.

---

## Claude.ai direto (sem Claude Code)

Usar quando a mudança cabe numa frase e você consegue apontar o arquivo e a linha. Abre uma conversa aqui, passa o trecho de código, recebe a correção, cola manualmente no arquivo.

Custa uma fração do Claude Code porque não carrega contexto do projeto.

Exemplos:
- Trocar uma classe Tailwind (`text-red-400` → `text-red-500`)
- Renomear uma função ou variável
- Corrigir um tipo TypeScript (`any` → tipo específico)
- Ajustar um texto ou label na UI
- Formatar ou reorganizar um bloco de código

---

## Regra de bolso

> Se você consegue apontar o arquivo e a linha — usa Claude.ai direto.
> Se precisa que o agente navegue pelo projeto pra entender o que fazer — usa Claude Code.
> Se é scaffold puro copiando padrão existente — Claude Code com Sonnet padrão.
> Se é feature nova com decisões a tomar — Claude Code com Sonnet High.