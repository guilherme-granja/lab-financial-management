# SPEC — Login por email/senha

**Data:** 2026-07-02
**Etapa:** 4 do roadmap multi-tenant (`docs/superpowers/plans/2026-07-02-arquitetura-multi-tenant-banco-por-usuario.md`)
**Arquivos afetados:** `src/hooks/useAuth.tsx`, `src/pages/Login.tsx`
**Não tocar em:** `src/pages/AuthCallback.tsx` (fluxo de GitHub OAuth continua igual), `src/router/index.tsx`, qualquer hook de dados.
**Modelo:** Sonnet 4.6 High
**Paralelismo:** Task 2 depende da Task 1 (usa o novo `signInWithPassword`).

---

## Contexto

Todos os usuários cadastrados a partir de agora (a começar pelo segundo usuário da Etapa 4.C) fazem login por e-mail/senha, criados manualmente pelo admin no chore — sem fluxo de "sign up". Você continua usando GitHub OAuth normalmente, já que já está configurado e funcionando. Os dois métodos coexistem no mesmo `useAuth`/Login, ambos rodando contra `choreClient` (fixo, criado na Etapa 3.A).

---

## Task 1 — src/hooks/useAuth.tsx

**Arquivo:** `src/hooks/useAuth.tsx`
> Review: sim

Adicionar `signInWithPassword` à interface `AuthState` e à implementação, usando `choreClient.auth.signInWithPassword`:

```ts
interface AuthState {
  user: User | null
  loading: boolean
  signInWithGithub: () => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}
```

```ts
const signInWithPassword = async (email: string, password: string): Promise<string | null> => {
  const { error } = await choreClient.auth.signInWithPassword({ email, password })
  return error?.message ?? null
}
```

Retorna a mensagem de erro (ou `null` se deu certo) em vez de lançar — o componente decide o que fazer com ela, seguindo o mesmo padrão de `formError` já usado em outras telas do projeto. O `onAuthStateChange`/`handleUser` já existente (da Spec 3.B) cobre a checagem de `user_databases` independente de qual método gerou a sessão — não precisa duplicar essa lógica aqui.

Restrição: não alterar `signInWithGithub`, `signOut`, nem a lógica de `handleUser` — só adicionar o método novo.

---

## Task 2 — src/pages/Login.tsx

**Arquivo:** `src/pages/Login.tsx`
> Review: sim

Adicionar um formulário de e-mail/senha abaixo do botão "Entrar com GitHub" existente, separado por um `<Separator>` (já disponível em `@/components/ui/separator`) com "ou" no meio. Seguir o padrão já estabelecido do projeto pra operações de escrita (`saving` + `formError`):

```tsx
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [saving, setSaving] = useState(false)
const [formError, setFormError] = useState<string | null>(null)

async function handlePasswordLogin(e: React.FormEvent) {
  e.preventDefault()
  setSaving(true)
  setFormError(null)
  const error = await signInWithPassword(email, password)
  if (error) setFormError(error)
  setSaving(false)
}
```

Formulário (usar `Input`/`Label` de `@/components/ui/`, mesmo padrão visual do resto do projeto):
```tsx
<form onSubmit={handlePasswordLogin} className="w-full flex flex-col gap-3">
  <div className="space-y-1">
    <Label htmlFor="email" className="text-slate-400 text-xs">E-mail</Label>
    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
  </div>
  <div className="space-y-1">
    <Label htmlFor="password" className="text-slate-400 text-xs">Senha</Label>
    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
  </div>
  {formError && <p className="text-red-400 text-sm">{formError}</p>}
  <Button type="submit" disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
    {saving ? 'Entrando...' : 'Entrar'}
  </Button>
</form>
```

O `useEffect` existente que redireciona pra `/` quando `user` fica disponível já cobre o caso de sucesso — não precisa de navegação manual dentro de `handlePasswordLogin`.

Restrição: não remover ou alterar o botão "Entrar com GitHub" nem o tratamento do `?error=unauthorized` já existente — só adicionar o formulário novo.

---

## Checklist

- [x] ~~Task 1~~ — não aplicável, ver nota de execução
- [x] ~~Task 2~~ — não aplicável, ver nota de execução
- [ ] ~~`tsc --noEmit`~~ — não aplicável, nenhuma mudança de código
- [ ] ~~`npx vitest run`~~ — não aplicável, nenhuma mudança de código
- [ ] ~~Testar manualmente~~ — não aplicável, fluxo já existente em produção
- [ ] ~~`git commit`~~ — não aplicável
- [ ] ~~`git push origin main`~~ — não aplicável

## Nota de execução (2026-07-02)

Premissa da spec estava desatualizada: commit `fa9f0dc` ("feat(auth): login com email, senha e OTP em duas etapas"), anterior a esta spec, já implementou login por e-mail/senha — e foi além, adicionando verificação OTP em duas etapas. Estado atual de `src/hooks/useAuth.tsx`: `signInWithEmail(email, password)` (lança erro em vez de retornar string) + `verifyEmailOtp(email, token)`. Estado atual de `src/pages/Login.tsx`: formulário completo de credenciais + tela de OTP; botão "Entrar com GitHub" está comentado/desabilitado, não ativo como a spec presumia.

Não foi feita nenhuma alteração de código — a spec pedia uma versão mais simples (sem OTP) de algo que já existe de forma mais completa. Se o formato divergente (`signInWithEmail` vs `signInWithPassword`, com/sem OTP) for um problema real, precisa de uma spec nova e explícita sobre isso, não uma reaplicação desta.
