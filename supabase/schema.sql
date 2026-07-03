-- CRM Sa Farinha Team — Schema Supabase
-- Execute no SQL Editor se ainda não criou as tabelas

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Etapas da pipeline (coluna etapa na tabela leads)
-- novo_lead | em_tratamento | qualificado | visita_agendada | visita_realizada
-- negociacao | cpcv_enviado | cpcv_assinado | aguarda_escritura | escritura_realizada

CREATE TABLE IF NOT EXISTS agentes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  email TEXT,
  telemovel TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  apelido TEXT,
  telemovel TEXT,
  email TEXT,
  tipologia TEXT,
  zona_interesse TEXT,
  origem TEXT,
  agente_id UUID REFERENCES agentes(id),
  temperatura TEXT CHECK (temperatura IN ('frio', 'morno', 'quente')),
  orcamento_maximo NUMERIC(12, 2),
  observacoes TEXT,
  etapa TEXT NOT NULL DEFAULT 'novo_lead',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tarefas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_limite TIMESTAMPTZ,
  concluida BOOLEAN NOT NULL DEFAULT FALSE,
  prioridade TEXT NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta')),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  agente_id UUID REFERENCES agentes(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  url TEXT,
  tipo TEXT,
  tamanho BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  assunto TEXT,
  corpo TEXT,
  remetente TEXT,
  destinatario TEXT,
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_updated_at ON leads;
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE agentes ENABLE ROW LEVEL SECURITY;
