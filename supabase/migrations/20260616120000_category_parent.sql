ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES categories(id) ON DELETE CASCADE;

-- Seed canônico de categorias (fonte da verdade: banco do Guilherme).
-- UUIDs literais — nunca gen_random_uuid(), pois filhos referenciam pais pelo
-- mesmo UUID dentro deste script. Idempotente via ON CONFLICT DO NOTHING.

-- Grupos (parent_id = NULL)
INSERT INTO categories (id, name, color, icon, type, parent_id) VALUES
  ('877d8756-29a5-47fc-a72e-16381b04b4d7', 'Alimentação', '#f97316', '🍔', 'expense', NULL),
  ('91e0be31-70db-4d9d-b0a0-46fd804509d6', 'Cuidado Pessoal', '#f9fd1c', '💆', 'expense', NULL),
  ('0f7535c5-65d8-4ac7-abb7-1fbb67c45a43', 'Despesas Financeiras', '#e5a5ee', '🤑', 'expense', NULL),
  ('9e4896ac-0127-4807-901e-d9c543b5dfcf', 'Educação/Trabalho', '#6366f1', '📚', 'expense', NULL),
  ('f4d9d0e1-033f-4eb2-9a70-59a1ce0b7e97', 'Lazer', '#eab308', '🎮', 'expense', NULL),
  ('5ea6ba71-5454-4b98-afe9-e0c8533f0270', 'Moradia', '#06b6d4', '🏠', 'expense', NULL),
  ('ec2d597e-5e6e-4740-8639-89f683e91e1a', 'Outros', '#64748b', '📦', 'both', NULL),
  ('e4a68585-d2c0-4b06-81f3-859dcf0cd203', 'Pix', '#0f8011', '❖', 'both', NULL),
  ('5d98d1d2-e0f9-4848-bf7a-9a5311478462', 'Salário', '#22c55e', '💼', 'income', NULL),
  ('a3da25c9-cc57-40a2-b9bb-b6a65739798b', 'Saúde', '#ec4899', '🏥', 'expense', NULL),
  ('6d782a00-1f8c-4592-9c5e-d9dff7441a79', 'Transporte', '#8b5cf6', '🚗', 'expense', NULL)
ON CONFLICT (id) DO NOTHING;

-- Subcategorias (parent_id referencia os UUIDs acima)
INSERT INTO categories (id, name, color, icon, type, parent_id) VALUES
  ('d57a46d0-938a-4823-8ce1-74f43d3ac93f', 'Emprestimos', '#a456ae', '🙌🏻', 'expense', '0f7535c5-65d8-4ac7-abb7-1fbb67c45a43'),
  ('b624991b-95b4-4f00-b62d-bef8d776b661', 'Juros/Mora', '#bd17d3', '💳', 'expense', '0f7535c5-65d8-4ac7-abb7-1fbb67c45a43'),
  ('19afacc5-9be3-4bcf-9c7a-ac6db3a4167e', 'Negociação de Divida', '#490a52', '💳', 'expense', '0f7535c5-65d8-4ac7-abb7-1fbb67c45a43'),
  ('7d4b1324-31d6-4f0a-828c-fe93ae6be9d3', '13º Salário', '#22c55e', '🎄', 'income', '5d98d1d2-e0f9-4848-bf7a-9a5311478462'),
  ('5f7b72f5-8043-4300-be91-6439884c0e74', 'Férias', '#22c55e', '🏖️', 'income', '5d98d1d2-e0f9-4848-bf7a-9a5311478462'),
  ('bb3cc944-9886-4ddb-be38-fa4f471271cb', 'Salário CLT', '#22c55e', '💼', 'income', '5d98d1d2-e0f9-4848-bf7a-9a5311478462'),
  ('2026fc44-8a24-4bc2-92e2-a983abcadb5c', 'Água e Esgoto', '#06b6d4', '💧', 'expense', '5ea6ba71-5454-4b98-afe9-e0c8533f0270'),
  ('0f2b5226-dff1-4d4f-9884-9c7236e1397b', 'Aluguel', '#06b6d4', '🏠', 'expense', '5ea6ba71-5454-4b98-afe9-e0c8533f0270'),
  ('f9835b4a-1a3b-413f-a755-0bfd3d14eb45', 'Celular', '#25525b', '📱', 'expense', '5ea6ba71-5454-4b98-afe9-e0c8533f0270'),
  ('4bc7f201-c285-44c4-8787-6ac9cea8155d', 'Condomínio', '#06b6d4', '🏢', 'expense', '5ea6ba71-5454-4b98-afe9-e0c8533f0270'),
  ('3415dbfa-7dde-4ecd-8272-a77bd35761f9', 'Energia Elétrica', '#06b6d4', '⚡', 'expense', '5ea6ba71-5454-4b98-afe9-e0c8533f0270'),
  ('14e169f3-3dce-4c72-bcb2-2fa81813873b', 'Gás', '#06b6d4', '🔥', 'expense', '5ea6ba71-5454-4b98-afe9-e0c8533f0270'),
  ('f7209d47-afaf-4837-81a2-9bf69d8026f3', 'Internet', '#06b6d4', '📡', 'expense', '5ea6ba71-5454-4b98-afe9-e0c8533f0270'),
  ('2ffd0527-b982-4823-a47a-83569a0bf9a8', 'Limpeza', '#455f63', '🧹', 'expense', '5ea6ba71-5454-4b98-afe9-e0c8533f0270'),
  ('b4433545-22bd-4098-8338-a5aef8d7ba63', 'Combustível', '#8b5cf6', '⛽', 'expense', '6d782a00-1f8c-4592-9c5e-d9dff7441a79'),
  ('5ce43511-ae6a-4ca9-ab02-527021449640', 'Estacionamento', '#8b5cf6', '🅿️', 'expense', '6d782a00-1f8c-4592-9c5e-d9dff7441a79'),
  ('dbbd341d-6165-47cd-bf8c-8fd24238d6b2', 'Manutenção do Carro', '#8b5cf6', '🔧', 'expense', '6d782a00-1f8c-4592-9c5e-d9dff7441a79'),
  ('3fc13b38-1607-4c13-99b4-44291a681e2f', 'Pedagio', '#21075f', '🛣️', 'expense', '6d782a00-1f8c-4592-9c5e-d9dff7441a79'),
  ('d59708d4-ded3-476b-b9c0-8b7117fa5e91', 'Uber / 99', '#8b5cf6', '🚕', 'expense', '6d782a00-1f8c-4592-9c5e-d9dff7441a79'),
  ('9e6cdc78-fcff-4e25-ba9c-23fe24040be2', 'Delivery', '#d97126', '🛵', 'expense', '877d8756-29a5-47fc-a72e-16381b04b4d7'),
  ('806fa000-d8ab-48da-87bb-55a70d9403fe', 'Feira / Hortifruti', '#944914', '🥦', 'expense', '877d8756-29a5-47fc-a72e-16381b04b4d7'),
  ('10126a4b-0de6-4aca-9848-eda8a7dffe1a', 'Padaria / Mercearia', '#ffb885', '🥖', 'expense', '877d8756-29a5-47fc-a72e-16381b04b4d7'),
  ('49431426-0707-426c-86b8-6e8063a0f20e', 'Supermercado', '#653c1f', '🛒', 'expense', '877d8756-29a5-47fc-a72e-16381b04b4d7'),
  ('780ba4cd-c225-4d6a-91d4-a1f8fe7752d5', 'Acessorios', '#edf042', '💍', 'expense', '91e0be31-70db-4d9d-b0a0-46fd804509d6'),
  ('125b2483-8493-46af-a213-e5ea4f7119f5', 'Cabelereiro', '#fdff70', '💇', 'expense', '91e0be31-70db-4d9d-b0a0-46fd804509d6'),
  ('97aa2c7d-c789-4d8a-bc43-bd289e77977c', 'Cosmeticos', '#7d7e49', '💅', 'expense', '91e0be31-70db-4d9d-b0a0-46fd804509d6'),
  ('6944780d-4de6-4450-804a-94e99ebb656d', 'Manicure/Pedicure', '#b4b649', '💅', 'expense', '91e0be31-70db-4d9d-b0a0-46fd804509d6'),
  ('5c5d22eb-af71-4f1b-a3ef-f266b32479e3', 'Maquiagem', '#c0c261', '💄', 'expense', '91e0be31-70db-4d9d-b0a0-46fd804509d6'),
  ('07f47c5c-ed9e-4079-bc1b-d45724ff847a', 'Roupas', '#747605', '👕', 'expense', '91e0be31-70db-4d9d-b0a0-46fd804509d6'),
  ('c328accc-acf0-4f1c-9232-18c9806cd6eb', 'Almoço', '#7677bc', '🍽️', 'expense', '9e4896ac-0127-4807-901e-d9c543b5dfcf'),
  ('f9d1f2f6-2bc7-429f-b548-c32134810ff8', 'Cursos e Assinaturas', '#6366f1', '🎓', 'expense', '9e4896ac-0127-4807-901e-d9c543b5dfcf'),
  ('f7dc0031-252b-441d-8725-b73b73b08896', 'Equipamentos/Acessorios', '#46477c', '👨‍💻', 'expense', '9e4896ac-0127-4807-901e-d9c543b5dfcf'),
  ('149baa89-a8a9-4b6c-85c1-aade3ba5af96', 'Escola / Faculdade', '#6366f1', '🏫', 'expense', '9e4896ac-0127-4807-901e-d9c543b5dfcf'),
  ('3a28c360-a518-49d8-8aff-0e5c1b72643c', 'Livros', '#6366f1', '📖', 'expense', '9e4896ac-0127-4807-901e-d9c543b5dfcf'),
  ('97acfd0e-3101-47a9-bda8-1e7df4b38b32', 'Academia', '#ec4899', '💪', 'expense', 'a3da25c9-cc57-40a2-b9bb-b6a65739798b'),
  ('eca4f840-19e8-4217-b5e8-0ae3d7512938', 'Consultas / Exames', '#ec4899', '🩺', 'expense', 'a3da25c9-cc57-40a2-b9bb-b6a65739798b'),
  ('bb001a39-1b9c-4fa2-b038-1e4fc65e708b', 'Farmácia', '#ec4899', '💊', 'expense', 'a3da25c9-cc57-40a2-b9bb-b6a65739798b'),
  ('098f51ad-e026-46db-87c3-8b88e76c56eb', 'Plano de Saúde', '#ec4899', '🏥', 'expense', 'a3da25c9-cc57-40a2-b9bb-b6a65739798b'),
  ('5f65a363-8621-42fb-88ba-ec05f80014ac', 'Pix Enviado', '#0f8011', '📤', 'expense', 'e4a68585-d2c0-4b06-81f3-859dcf0cd203'),
  ('d05db994-bed3-4d3f-bfcc-46ce4be9e656', 'Pix Recebido', '#0f8011', '📲', 'income', 'e4a68585-d2c0-4b06-81f3-859dcf0cd203'),
  ('e0b1fb56-7e68-4c93-aead-49a4afa774eb', 'Doações', '#64748b', '🤝', 'expense', 'ec2d597e-5e6e-4740-8639-89f683e91e1a'),
  ('210f3536-e57b-468b-90fc-737c6c747fbb', 'Não Categorizado', '#64748b', '❓', 'both', 'ec2d597e-5e6e-4740-8639-89f683e91e1a'),
  ('d873bdc1-4641-4ccc-97e9-0f13a14aef82', 'Presentes', '#64748b', '🎁', 'expense', 'ec2d597e-5e6e-4740-8639-89f683e91e1a'),
  ('7c0e8b74-02fd-465f-9143-b8073a609194', 'Alimentação Geral', '#eab308', '📦', 'expense', 'f4d9d0e1-033f-4eb2-9a70-59a1ce0b7e97'),
  ('23a8f02d-d8a6-4be3-b26e-0420ed6f36e6', 'Eventos e Shows', '#eab308', '🎟️', 'expense', 'f4d9d0e1-033f-4eb2-9a70-59a1ce0b7e97'),
  ('52696836-0385-4da3-a98f-479040aa3a6c', 'Hobbies', '#eab308', '🎮', 'expense', 'f4d9d0e1-033f-4eb2-9a70-59a1ce0b7e97'),
  ('423a63de-dfc3-41d5-a782-1464396523d3', 'Restaurantes e Bares', '#eab308', '🍺', 'expense', 'f4d9d0e1-033f-4eb2-9a70-59a1ce0b7e97'),
  ('8041402c-4da8-4196-a3de-bf5568670f24', 'Streaming', '#eab308', '📺', 'expense', 'f4d9d0e1-033f-4eb2-9a70-59a1ce0b7e97'),
  ('c70622db-3a17-48f1-a143-f7893a902851', 'Viagens - Alimentação', '#eab308', '🛒', 'expense', 'f4d9d0e1-033f-4eb2-9a70-59a1ce0b7e97'),
  ('96c06fa4-1534-41e2-b656-f25d9370cc47', 'Viagens — Hospedagem', '#eab308', '🏨', 'expense', 'f4d9d0e1-033f-4eb2-9a70-59a1ce0b7e97'),
  ('775abb65-2bf8-45e2-a05f-87fd0ef2bd2c', 'Viagens — Transporte', '#eab308', '✈️', 'expense', 'f4d9d0e1-033f-4eb2-9a70-59a1ce0b7e97')
ON CONFLICT (id) DO NOTHING;
