---
description: Converte mockups estáticos (pasta com code.html, screen.png, DESIGN.md) em componentes React de produção seguindo as convenções reais do projeto — Tailwind v4, shadcn/ui, TypeScript strict, hooks customizados. Usada quando uma spec referencia uma pasta de mockup em vez de colar HTML/CSS direto no texto, para economizar tokens.
when_to_use: Disparar sempre que uma spec (ou o usuário) referenciar um caminho de mockup no formato <pasta>/<nome-da-tela>/code.html + screen.png + DESIGN.md, pedindo para implementar/converter aquela tela em React.
---

# Mockup to React Skill

## Como ler o mockup

Cada pasta de mockup tem 3 arquivos — leia os três antes de escrever qualquer componente:

1. **`code.html`** — estrutura, textos reais em português, e as classes Tailwind usadas no protótipo (via CDN, não é o setup real do projeto).
2. **`screen.png`** — visual final renderizado. Use pra confirmar espaçamento, alinhamento e hierarquia visual que o HTML sozinho não deixa claro.
3. **`DESIGN.md`** — front-matter YAML com tokens (cores, tipografia, spacing, radius) + texto descrevendo o sistema de design daquela feature. Quando várias pastas de uma mesma feature têm `DESIGN.md` idêntico, é o mesmo design system — extrair os tokens uma vez, não repetir a leitura por página.

## Regras de conversão

**Nunca copiar infraestrutura de protótipo pro app real:**
- Não adicionar `<script src="cdn.tailwindcss.com">`, links de Google Fonts, ou o CDN do Material Symbols no app de produção — o projeto já tem Tailwind v4 configurado localmente e a fonte Inter já deve estar disponível (conferir `index.css`/`index.html` antes de assumir).
- O `tailwind.config` inline no `<script id="tailwind-config">` do mockup não é o config real do projeto — é só onde o protótipo define os tokens. Os valores (cores, spacing) são o que importa, não o mecanismo.

**Ícones — Material Symbols (mockup) → lucide-react (projeto real):**
O protótipo usa `<span class="material-symbols-outlined">nome</span>`. Mapear pro ícone lucide-react equivalente. Tabela de referência pros nomes mais comuns (usar o nome mais próximo semanticamente quando não listado):

| Material Symbols | lucide-react |
|---|---|
| dashboard / grid_view | `LayoutDashboard` |
| group | `Users` |
| history | `History` |
| logout | `LogOut` |
| add | `Plus` |
| refresh | `RefreshCw` |
| trending_up | `TrendingUp` |
| login | `LogIn` |
| person_add | `UserPlus` |
| settings | `Settings` |
| delete | `Trash2` |
| mail | `Mail` |
| lock | `Lock` |
| visibility | `Eye` |
| arrow_forward | `ArrowRight` |
| open_in_new | `ExternalLink` |
| person_search | `UserSearch` |

**Componentes semânticos → shadcn/ui já disponível no projeto:**
`<table>` → `Table`/`TableHeader`/`TableRow`/`TableCell` (`@/components/ui/table`). `<button>` → `Button`. `<input>` → `Input` + `Label`. Badges de status (Ativo/Inativo) → `Badge`. Cards de métrica → `Card`. Nunca criar esses elementos do zero em HTML puro se o componente shadcn equivalente já existir no projeto — conferir `src/components/ui/` antes de escrever.

**Paleta de cores própria do admin, isolada do app principal:**
Se o `DESIGN.md` da feature usa tokens diferentes dos já definidos em `src/index.css` (cores, não estrutura), **não sobrescrever** as variáveis CSS do app principal. Criar um escopo próprio — ex: uma classe wrapper (`.admin-theme`) com suas próprias CSS variables, aplicada só na árvore de rotas `/admin`, ou um arquivo CSS separado importado só nesse contexto. O app principal (`/`, `/transactions`, etc.) não pode mudar de cor por causa disso.

**Dado real, não fake:**
O mockup tem números/nomes inventados pra preencher a tela (ex: "1.240 usuários", "João D. Silva"). Substituir por dado real vindo de hooks — nunca deixar valor hardcoded do mockup no componente final. Segue a mesma regra já existente no projeto: Supabase nunca é chamado direto em página/componente, sempre via hook customizado.

## Depois de converter

Os arquivos de mockup (`code.html`, `screen.png`, `DESIGN.md`) continuam no repo como referência de design — não apagar por conta própria depois de implementar, a menos que o usuário peça explicitamente.
