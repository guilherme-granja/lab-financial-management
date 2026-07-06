-- Adiciona coluna first_login na tabela profiles do banco chore
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_login boolean NOT NULL DEFAULT true;

-- Usuários existentes já fizeram login anteriormente; marcar como false
UPDATE public.profiles SET first_login = false;
