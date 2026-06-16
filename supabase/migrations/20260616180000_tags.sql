-- Tabela de tags
CREATE TABLE tags (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tags_name_unique UNIQUE (name)
);

-- RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage tags"
  ON tags FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Coluna na tabela de transações
ALTER TABLE transactions
  ADD COLUMN tag_id uuid REFERENCES tags(id) ON DELETE SET NULL;
