import type { LeadEtapa, LeadTemperatura } from "./index";

/** Linha bruta da tabela leads no Supabase */
export interface LeadRow extends Record<string, unknown> {
  id: string;
  nome: string;
  apelido: string | null;
  telemovel: string | null;
  email: string | null;
  tipologia: string | null;
  zona_interesse: string | null;
  origem: string | null;
  agente_id: string | null;
  temperatura: LeadTemperatura | null;
  orcamento_maximo: number | null;
  observacoes: string | null;
  etapa: LeadEtapa;
  estado_final: string | null;
  motivo_perda: string | null;
  estado_lead: string | null;
  tipo_proxima_acao: string | null;
  data_proxima_acao: string | null;
  created_at: string;
  updated_at: string;
  agentes?: { nome: string } | null;
}

export interface AgenteRow {
  id: string;
  nome: string;
  email?: string | null;
  telemovel?: string | null;
  ativo?: boolean | null;
  created_at?: string;
}

export interface TarefaRow {
  id: string;
  titulo: string;
  descricao: string | null;
  data_limite: string | null;
  concluida: boolean;
  prioridade: string;
  lead_id: string | null;
  agente_id: string | null;
  created_at: string;
}