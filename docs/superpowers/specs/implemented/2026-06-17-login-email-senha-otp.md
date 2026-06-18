# SPEC — Login com Email, Senha e OTP

**Data:** 2026-06-17
**Arquivos afetados:**
- `src/hooks/useAuth.tsx`
- `src/pages/Login.tsx`

**Não tocar em:**
- `src/pages/AuthCallback.tsx` — continua funcionando para o fluxo GitHub (não remover)
- `src/router/index.tsx` — nenhuma rota muda
- `src/lib/supabase.ts`
- `src/components/ui/` (não criar componentes novos — usar apenas `Input`, `Button`, `Label` já existentes)

**Modelo:** Sonnet 4.6 High

**Paralelismo:** Tasks 1 e 2 são sequenciais — Task 2 consome os novos métodos exportados pela Task 1.

---

## Contexto

O login atual usa `supabase.auth.signInWithOAuth({ provider: 'github' })` via `signInWithGithub()` no hook `useAuth.tsx` e um botão único na `Login.tsx`.

A configuração do Supabase já está pronta para email+senha:
- "Allow new users to sign up" **desativado** — usuários só podem ser criados pelo Supabase Dashboard
- "Confirm email" **ativado** — após `signInWithPassword`, o Supabase **não cria sessão imediatamente**; envia um OTP de 8 dígitos por email e retorna `session: null`
- O cliente deve então chamar `verifyOtp({ email, token, type: 'email' })` para completar o login

O fluxo completo de login será em **duas etapas**:
1. **Etapa 1** — usuário informa email + senha → `signInWithPassword` → OTP enviado por email
2. **Etapa 2** — usuário informa o código de 8 dígitos recebido → `verifyOtp` → sessão criada → redirect para `/`

**Nenhuma alteração no Supabase Dashboard é necessária.** A configuração descrita já é a correta para este fluxo.

---

## Task 1 — Adicionar `signInWithEmail` e `verifyEmailOtp` ao `useAuth.tsx`

**Arquivo:** `src/hooks/useAuth.tsx`
> Review: não

Manter `signInWithGithub` intacto. Adicionar dois novos métodos à interface `AuthState` e à implementação:

```ts
interface AuthState {
  user: User | null
  loading: boolean
  signInWithGithub: () => Promise<void>           // não remover
  signInWithEmail: (email: string, password: string) => Promise<void>
  verifyEmailOtp: (email: string, token: string) => Promise<void>
  signOut: () => Promise<void>
}
```

Implementação de `signInWithEmail`:
```ts
const signInWithEmail = async (email: string, password: string): Promise<void> => {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  // Com "Confirm email" ativo, session será null até verifyEmailOtp ser chamado.
}
```

Implementação de `verifyEmailOtp`:
```ts
const verifyEmailOtp = async (email: string, token: string): Promise<void> => {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) throw new Error(error.message)
  // onAuthStateChange dispara automaticamente após session criada
}
```

Incluir os dois métodos no `value` do `AuthContext.Provider`.

Restrições:
- Não alterar `handleUser`, `signOut`, `signInWithGithub`, nem a lógica de `onAuthStateChange`
- A validação de `VITE_ALLOWED_EMAIL` já existe em `handleUser` e continua funcionando sem alteração

---

## Task 2 — Reescrever `Login.tsx` com design e fluxo em duas etapas

**Arquivo:** `src/pages/Login.tsx`
> Review: sim

A página passa a ter dois estados internos controlados por `step: 'credentials' | 'otp'`.

### Estado local

```ts
const [step, setStep] = useState<'credentials' | 'otp'>('credentials')
const [email, setEmail] = useState('')
const [password, setPassword] = useState('')
const [showPassword, setShowPassword] = useState(false)
const [otpDigits, setOtpDigits] = useState<string[]>(Array(8).fill(''))
const [loading, setLoading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

Os 8 dígitos do OTP são gerenciados como array `string[]` de tamanho 8, com refs individuais por input para permitir o avanço automático de foco.

---

### Layout geral — ambas as etapas

**Background:** gradiente radial escuro, do centro para as bordas:
```tsx
<div className="min-h-screen flex flex-col items-center bg-[#0d0f1a]"
     style={{ background: 'radial-gradient(ellipse at 50% 40%, #12152b 0%, #0d0f1a 70%)' }}>
```

**Logo no topo** (fora do card, centralizado, ~80px de margin-top):
```tsx
<div className="flex items-center gap-2 mt-20 mb-12">
  <ShoppingBag size={28} className="text-yellow-400" />
  <span className="text-white text-xl font-semibold">Lab Finanças</span>
</div>
```
Usar ícone `ShoppingBag` do `lucide-react` (já instalado).

---

### Etapa 1 — Credenciais

**Card** centralizado, `max-w-lg w-full mx-auto`, fundo `#161824`, bordas arredondadas `rounded-2xl`, padding `p-10`:
```tsx
<div className="bg-[#161824] rounded-2xl p-10 w-full max-w-lg">
```

**Título e subtítulo:**
```tsx
<h1 className="text-white text-3xl font-bold text-center mb-1">Bem-vindo de volta</h1>
<p className="text-slate-400 text-sm text-center mb-8">Acesse sua inteligência financeira</p>
```

**Campo EMAIL** — label uppercase com letter-spacing, input com ícone à esquerda:
```tsx
<div className="space-y-1.5 mb-4">
  <label className="text-slate-400 text-xs font-semibold tracking-widest uppercase">Email</label>
  <div className="relative">
    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
    <Input
      type="email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
      placeholder="seu@email.com"
      className="pl-10 bg-[#1e2136] border-[#2d3148] text-slate-200 placeholder:text-slate-600 rounded-xl h-12"
    />
  </div>
</div>
```

**Campo SENHA** — igual ao email, com ícone de cadeado e botão olho à direita:
```tsx
<div className="space-y-1.5 mb-6">
  <label className="text-slate-400 text-xs font-semibold tracking-widest uppercase">Senha</label>
  <div className="relative">
    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
    <Input
      type={showPassword ? 'text' : 'password'}
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
      placeholder="••••••••"
      className="pl-10 pr-10 bg-[#1e2136] border-[#2d3148] text-slate-200 placeholder:text-slate-600 rounded-xl h-12"
    />
    <button
      type="button"
      onClick={() => setShowPassword((v) => !v)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
    >
      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  </div>
</div>
```

**Botão Entrar:**
```tsx
<Button
  onClick={handleSignIn}
  disabled={loading}
  className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium text-base gap-2"
>
  {loading ? 'Entrando...' : <><span>Entrar</span><ArrowRight size={18} /></>}
</Button>
```

**Bloco de erro** (quando `error !== null`), abaixo do botão:
```tsx
<div className="mt-4 bg-red-950 border border-red-800 text-red-400 text-sm rounded-xl px-4 py-3">
  {error}
</div>
```

**Mapeamento de erros** no `handleSignIn`:
- `"Invalid login credentials"` → `"Email ou senha incorretos"`
- `"Email not confirmed"` → `"Email não confirmado. Verifique sua caixa de entrada."`
- outros → usar `err.message`

**Botão GitHub** — manter no código mas comentado:
```tsx
{/* GitHub login — desabilitado temporariamente
<Button onClick={signInWithGithub} ...>Entrar com GitHub</Button>
*/}
```

**Rodapé** fora do card, abaixo, centralizado:
```tsx
<p className="mt-8 text-slate-600 text-xs tracking-widest uppercase">
  Segurança Bancária End-to-End
</p>
```

---

### Etapa 2 — OTP

Sem card com borda visível — área mais aberta, mesmo fundo. Container `max-w-lg w-full mx-auto`.

**Título e subtítulo:**
```tsx
<h1 className="text-white text-3xl font-bold text-center mb-2">Verifique seu e-mail</h1>
<p className="text-slate-400 text-sm text-center mb-10">
  Enviamos um código de 8 dígitos para seu e-mail
</p>
```

**8 inputs individuais** — um `<input>` por dígito, com avanço automático de foco:

```tsx
// refs: const digitRefs = useRef<(HTMLInputElement | null)[]>(Array(8).fill(null))

<div className="flex gap-2 justify-center mb-6">
  {otpDigits.map((digit, i) => (
    <input
      key={i}
      ref={(el) => { digitRefs.current[i] = el }}
      type="text"
      inputMode="numeric"
      maxLength={1}
      value={digit}
      onChange={(e) => handleOtpChange(i, e.target.value)}
      onKeyDown={(e) => handleOtpKeyDown(i, e)}
      className="w-11 h-14 text-center text-white text-xl font-bold
                 bg-[#1e2136] border border-[#2d3148] rounded-xl
                 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500
                 caret-transparent"
    />
  ))}
</div>
```

Lógica de `handleOtpChange(i, value)`:
- Aceitar apenas dígito `[0-9]`; se não for, ignorar
- Setar `otpDigits[i] = value`
- Se `value` não for vazio, mover foco para `digitRefs.current[i + 1]`

Lógica de `handleOtpKeyDown(i, e)`:
- Se `Backspace` e `otpDigits[i]` for vazio, mover foco para `digitRefs.current[i - 1]`
- Se `Enter` e todos os 8 dígitos preenchidos, chamar `handleVerify()`

O token enviado ao Supabase é `otpDigits.join('')`.

**Botão Confirmar:**
```tsx
<Button
  onClick={handleVerify}
  disabled={loading || otpDigits.join('').length < 8}
  className="w-full h-12 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium text-base"
>
  {loading ? 'Verificando...' : 'Confirmar'}
</Button>
```

**Mapeamento de erros** no `handleVerify`:
- `"Token has expired or is invalid"` → `"Código inválido ou expirado. Tente fazer login novamente."` + `setStep('credentials')` + limpar `otpDigits`
- outros → exibir `err.message`

**Ícone de cadeado em círculo** abaixo do container (decorativo):
```tsx
<div className="mt-10 flex justify-center">
  <div className="w-16 h-16 rounded-full bg-[#1e2136] flex items-center justify-center">
    <Lock size={24} className="text-indigo-400" />
  </div>
</div>
```

**Rodapé** fora do container:
```tsx
<p className="mt-8 text-slate-600 text-xs flex items-center gap-1.5 justify-center">
  <ShieldCheck size={13} />
  Ambiente Seguro &amp; Criptografado
</p>
```

---

### Imports necessários na Task 2

```tsx
import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react'
```

Não importar `Label` de shadcn — usar `<label>` HTML direto com as classes de estilo descritas acima.

### Restrições gerais da Task 2

- Não usar `<form>` — capturar Enter via `onKeyDown`
- Não criar componentes separados — tudo inline
- Não remover o bloco `?error=unauthorized` de `searchParams` — manter no topo do retorno JSX para compatibilidade com `AuthCallback`
- O redirect após login bem-sucedido **não precisa ser implementado** — já funciona via `onAuthStateChange` → `setUser` → `useEffect` existente em `Login.tsx`
- Não chamar `supabase` diretamente — usar apenas `signInWithEmail` e `verifyEmailOtp` via `useAuth()`

---

## Checklist

- [ ] Task 1 concluída
- [ ] Task 2 concluída
- [ ] `tsc --noEmit` — zero erros
- [ ] Testar: credenciais erradas → mensagem correta; credenciais ok → tela OTP; código correto → entra; código errado → erro + volta para credenciais
- [ ] `git commit -m "feat: login com email, senha e OTP"`
- [ ] `git push origin main && npm run deploy`