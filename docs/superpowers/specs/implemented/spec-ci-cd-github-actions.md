# SPEC — CI/CD com GitHub Actions

**Data:** 2026-06-17
**Arquivos afetados:**
- `.github/workflows/ci.yml`
- `package.json` (ajuste no script `deploy`)

**Não tocar em:**
- `vite.config.ts`
- `src/test/setup.ts`
- `src/test/mocks/supabase.ts`
- Qualquer arquivo de configuração do Supabase
- Todos os arquivos `src/`

**Modelo:** Sonnet padrão
**Paralelismo:** omitido — tasks sequenciais

---

## Contexto

O deploy hoje é feito localmente via `npm run deploy` (script no `package.json`), o que exige que o `.env` esteja presente e correto na máquina do desenvolvedor no momento do build. Isso causou um incidente recente onde variáveis de ambiente ficaram `undefined` em produção. Não existe a pasta `.github/` no repositório. Os testes unitários existem (`vitest run`) mas nunca são executados de forma automatizada antes do deploy.

---

## Task 1 — Criar o workflow de CI/CD

**Arquivo:** `.github/workflows/ci.yml`
> Review: não

Criar o arquivo com o conteúdo abaixo exatamente como especificado.

O workflow deve ter **dois jobs separados**:

### Job `test`
- Roda em: `ubuntu-latest`
- Trigger: `push` e `pull_request` para a branch `main`
- Node.js: `22.x` (via `actions/setup-node@v4` com cache `npm`)
- Passos:
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` com `node-version: '22.x'` e `cache: 'npm'`
  3. `npm ci`
  4. `npm run test:run`

### Job `deploy`
- Roda em: `ubuntu-latest`
- Depende de: `needs: test` (só executa se `test` passar)
- Trigger: apenas `push` para `main` (não roda em PRs)
- Node.js: `22.x` com cache `npm`
- Passos:
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4`
  3. `npm ci`
  4. `npm run build` — usa as variáveis de ambiente abaixo
  5. `cp dist/index.html dist/404.html`
  6. Deploy via `peaceiris/actions-gh-pages@v4` com `github_token: ${{ secrets.GITHUB_TOKEN }}` e `publish_dir: ./dist`

Variáveis de ambiente para o step de build:
```yaml
env:
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
  VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
  VITE_ALLOWED_EMAIL: ${{ secrets.VITE_ALLOWED_EMAIL }}
```

Conteúdo completo do arquivo:

```yaml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Testes
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'

      - name: Instalar dependências
        run: npm ci

      - name: Executar testes
        run: npm run test:run

  deploy:
    name: Build e Deploy
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22.x'
          cache: 'npm'

      - name: Instalar dependências
        run: npm ci

      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_ALLOWED_EMAIL: ${{ secrets.VITE_ALLOWED_EMAIL }}

      - name: Copiar 404.html
        run: cp dist/index.html dist/404.html

      - name: Deploy para GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

---

## Task 2 — Simplificar o script `deploy` no package.json

**Arquivo:** `package.json`
> Review: não

O script `deploy` atual faz build + cp + gh-pages localmente. Com o GitHub Actions assumindo essa responsabilidade, o script local pode ser simplificado para evitar deploys acidentais a partir da máquina do desenvolvedor.

Substituir:
```json
"deploy": "tsc && vite build && cp dist/index.html dist/404.html && gh-pages -d dist"
```

Por:
```json
"deploy": "echo 'Deploy automatizado via GitHub Actions no push para main'"
```

---

## Checklist

- [ ] Task 1 concluída — `.github/workflows/ci.yml` criado
- [ ] Task 2 concluída — script `deploy` atualizado no `package.json`
- [ ] `git commit -m "ci: adicionar pipeline de CI/CD com GitHub Actions"`
- [ ] `git push origin main`
- [ ] Configurar os 3 Secrets no GitHub (ver instruções abaixo)
- [ ] Verificar na aba **Actions** do repositório se o workflow disparou e passou

---

## Pós-deploy: configurar Secrets no GitHub

Após o push, acessar:
**GitHub → repositório → Settings → Secrets and variables → Actions → New repository secret**

Criar os três secrets:

| Nome | Valor |
|---|---|
| `VITE_SUPABASE_URL` | `https://cutjwwnwfyfidkxqgjdk.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` (chave anon completa) |
| `VITE_ALLOWED_EMAIL` | `guilhermegranja.dev@gmail.com` |

Sem esses secrets, o job `deploy` vai buildar com variáveis `undefined` — o mesmo problema de antes.

---

## Observação sobre `peaceiris/actions-gh-pages`

Essa action é o padrão consolidado para deploy no GitHub Pages a partir de Actions. Ela cuida do push para a branch `gh-pages` com o token do repositório (`GITHUB_TOKEN` é fornecido automaticamente pelo GitHub — não precisa criar). O repositório precisa ter **GitHub Pages configurado para servir da branch `gh-pages`** em Settings → Pages.
