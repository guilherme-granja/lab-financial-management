ALTER TABLE categories
  ADD COLUMN parent_id uuid REFERENCES categories(id) ON DELETE CASCADE;

-- Subcategorias de Salário
INSERT INTO categories (name, icon, color, type, parent_id)
SELECT name, icon, color, type,
  (SELECT id FROM categories WHERE name = 'Salário' LIMIT 1)
FROM (VALUES
  ('Salário CLT',  '💼', '#22c55e', 'income'),
  ('Pró-labore',   '🏢', '#22c55e', 'income'),
  ('13º Salário',  '🎄', '#22c55e', 'income'),
  ('Férias',       '🏖️', '#22c55e', 'income')
) AS t(name, icon, color, type);

-- Subcategorias de Pix
INSERT INTO categories (name, icon, color, type, parent_id)
SELECT name, icon, color, type,
  (SELECT id FROM categories WHERE name = 'Pix' LIMIT 1)
FROM (VALUES
  ('Pix Recebido', '📲', '#0f8011', 'income'),
  ('Pix Enviado',  '📤', '#0f8011', 'expense')
) AS t(name, icon, color, type);

-- Subcategorias de Alimentação
INSERT INTO categories (name, icon, color, type, parent_id)
SELECT name, icon, color, type,
  (SELECT id FROM categories WHERE name = 'Alimentação' LIMIT 1)
FROM (VALUES
  ('Supermercado',         '🛒', '#f97316', 'expense'),
  ('Padaria / Mercearia',  '🥖', '#f97316', 'expense'),
  ('Feira / Hortifruti',   '🥦', '#f97316', 'expense'),
  ('Delivery',             '🛵', '#f97316', 'expense'),
  ('Viagens — Alimentação','🍽️', '#f97316', 'expense')
) AS t(name, icon, color, type);

-- Subcategorias de Educação
INSERT INTO categories (name, icon, color, type, parent_id)
SELECT name, icon, color, type,
  (SELECT id FROM categories WHERE name = 'Educação' LIMIT 1)
FROM (VALUES
  ('Cursos e Assinaturas', '🎓', '#6366f1', 'expense'),
  ('Livros',               '📖', '#6366f1', 'expense'),
  ('Escola / Faculdade',   '🏫', '#6366f1', 'expense')
) AS t(name, icon, color, type);

-- Subcategorias de Lazer
INSERT INTO categories (name, icon, color, type, parent_id)
SELECT name, icon, color, type,
  (SELECT id FROM categories WHERE name = 'Lazer' LIMIT 1)
FROM (VALUES
  ('Restaurantes e Bares', '🍺', '#eab308', 'expense'),
  ('Streaming',            '📺', '#eab308', 'expense'),
  ('Viagens — Hospedagem', '🏨', '#eab308', 'expense'),
  ('Viagens — Transporte', '✈️', '#eab308', 'expense'),
  ('Eventos e Shows',      '🎟️', '#eab308', 'expense'),
  ('Hobbies',              '🎮', '#eab308', 'expense')
) AS t(name, icon, color, type);

-- Subcategorias de Moradia
INSERT INTO categories (name, icon, color, type, parent_id)
SELECT name, icon, color, type,
  (SELECT id FROM categories WHERE name = 'Moradia' LIMIT 1)
FROM (VALUES
  ('Aluguel',          '🏠', '#06b6d4', 'expense'),
  ('Condomínio',       '🏢', '#06b6d4', 'expense'),
  ('Energia Elétrica', '⚡', '#06b6d4', 'expense'),
  ('Água e Esgoto',    '💧', '#06b6d4', 'expense'),
  ('Internet',         '📡', '#06b6d4', 'expense'),
  ('Gás',              '🔥', '#06b6d4', 'expense')
) AS t(name, icon, color, type);

-- Subcategorias de Outros
INSERT INTO categories (name, icon, color, type, parent_id)
SELECT name, icon, color, type,
  (SELECT id FROM categories WHERE name = 'Outros' LIMIT 1)
FROM (VALUES
  ('Doações',          '🤝', '#64748b', 'expense'),
  ('Presentes',        '🎁', '#64748b', 'expense'),
  ('Não Categorizado', '❓', '#64748b', 'both')
) AS t(name, icon, color, type);

-- Subcategorias de Saúde
INSERT INTO categories (name, icon, color, type, parent_id)
SELECT name, icon, color, type,
  (SELECT id FROM categories WHERE name = 'Saúde' LIMIT 1)
FROM (VALUES
  ('Plano de Saúde',     '🏥', '#ec4899', 'expense'),
  ('Farmácia',           '💊', '#ec4899', 'expense'),
  ('Consultas / Exames', '🩺', '#ec4899', 'expense'),
  ('Academia',           '💪', '#ec4899', 'expense')
) AS t(name, icon, color, type);

-- Subcategorias de Transporte
INSERT INTO categories (name, icon, color, type, parent_id)
SELECT name, icon, color, type,
  (SELECT id FROM categories WHERE name = 'Transporte' LIMIT 1)
FROM (VALUES
  ('Combustível',         '⛽', '#8b5cf6', 'expense'),
  ('Uber / 99',           '🚕', '#8b5cf6', 'expense'),
  ('Estacionamento',      '🅿️', '#8b5cf6', 'expense'),
  ('Manutenção do Carro', '🔧', '#8b5cf6', 'expense'),
  ('Transporte Público',  '🚌', '#8b5cf6', 'expense')
) AS t(name, icon, color, type);
