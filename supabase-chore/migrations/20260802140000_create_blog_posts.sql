create table public.blog_posts (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  excerpt        text not null,
  content        text not null,        -- markdown
  related_screen text,                 -- ex: 'budgets', 'transactions', 'accounts' — null = não aparece em nenhum RelatedPosts
  published_at   timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index blog_posts_related_screen_idx on public.blog_posts(related_screen);
create index blog_posts_published_at_idx on public.blog_posts(published_at desc);

alter table public.blog_posts enable row level security;

create policy "Usuarios autenticados leem posts"
  on public.blog_posts for select
  using (auth.role() = 'authenticated');

-- Sem policy de insert/update/delete: posts são criados apenas via migration/seed manual (sem admin UI).

-- Seed: primeiro post do blog
insert into public.blog_posts (slug, title, excerpt, content, related_screen, published_at) values (
  '50-30-20-metodo-orcamento',
  'O método 50/30/20: como dividir seu orçamento sem complicação',
  'Uma forma simples de organizar receitas entre contas essenciais, lazer e reservas — e por que ela funciona melhor do que uma planilha cheia de categorias.',
  $md$## Como funciona a divisão

O método 50/30/20 é uma das formas mais simples de organizar o orçamento familiar: em vez de dezenas de categorias, você divide sua receita mensal em apenas três grandes grupos.

- **50% — Contas essenciais:** moradia, alimentação, transporte, saúde.
- **30% — Lazer:** tudo que é desejo, não necessidade.
- **20% — Guardar:** reserva de emergência, investimentos, quitação de dívidas.

A vantagem principal não é a precisão — é a simplicidade. Categorizar cada transação em "essencial" ou "lazer" é uma decisão muito mais rápida do que escolher entre quinze categorias específicas.

No Lab Finanças, essa classificação é feita por transação (não por categoria), porque a mesma categoria — como "Compras" — pode ser uma necessidade em um mês e lazer em outro.

## Quando o 50/30/20 não é o ideal

Se sua reserva de emergência já está completa, vale considerar o preset 70/20/10 (mais folga para lazer) — ou o 60/30/10 se as contas fixas pesam mais na sua realidade. Os três presets estão disponíveis na tela de Orçamentos, junto com a opção de personalizar os percentuais livremente.

## Colocando em prática

1. Marque cada receita que deve entrar no cálculo do orçamento com "Contabilizar no Orçamento".
2. Ao registrar uma despesa, classifique-a como necessidade ou lazer — o que sobrar é considerado reserva automaticamente.
3. Acompanhe o progresso de cada faixa na tela de Orçamentos, mês a mês.

Não existe classificação perfeita na primeira tentativa. O importante é revisar de tempos em tempos e ajustar o que não fizer mais sentido.
$md$,
  'budgets',
  now()
);
