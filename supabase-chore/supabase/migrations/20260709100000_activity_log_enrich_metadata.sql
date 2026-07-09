-- Nenhuma alteração de schema necessária.
-- A coluna metadata (jsonb) na tabela activity_log já comporta
-- os campos adicionais: ip, user_agent, city, region, country.
-- Esta migration existe apenas para registro histórico.
SELECT 1;
