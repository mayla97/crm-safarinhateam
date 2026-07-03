-- Políticas RLS para permitir o CRM com chave anon (sem login)
-- Execute no SQL Editor do Supabase se receber erros 401

-- LEADS
DROP POLICY IF EXISTS "anon_select_leads" ON leads;
DROP POLICY IF EXISTS "anon_insert_leads" ON leads;
DROP POLICY IF EXISTS "anon_update_leads" ON leads;

CREATE POLICY "anon_select_leads" ON leads FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_leads" ON leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_leads" ON leads FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- TAREFAS
DROP POLICY IF EXISTS "anon_select_tarefas" ON tarefas;
DROP POLICY IF EXISTS "anon_insert_tarefas" ON tarefas;
DROP POLICY IF EXISTS "anon_update_tarefas" ON tarefas;

CREATE POLICY "anon_select_tarefas" ON tarefas FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_tarefas" ON tarefas FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_tarefas" ON tarefas FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- AGENTES
DROP POLICY IF EXISTS "anon_select_agentes" ON agentes;
CREATE POLICY "anon_select_agentes" ON agentes FOR SELECT TO anon USING (true);
