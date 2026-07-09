export type LeadEtapa =
  | "novo_lead"
  | "em_tratamento"
  | "qualificado"
  | "visita_agendada"
  | "visita_realizada"
  | "negociacao"
  | "cpcv_enviado"
  | "cpcv_assinado"
  | "aguarda_escritura"
  | "escritura_realizada";

export type LeadTemperatura = "frio" | "morno" | "quente";

export interface Agente {
  id: string;
  nome: string;
  email?: string | null;
  telemovel?: string | null;
  ativo?: boolean | null;
  created_at?: string;
}

export interface Lead {
  id: string;
  nome: string;
  apelido: string | null;
  telemovel: string | null;
  email: string | null;
  tipologia: string | null;
  zona_interesse: string | null;
  origem: string | null;
  agente_id: string | null;
  agente_nome: string | null;
  temperatura: LeadTemperatura | null;
  orcamento_maximo: number | null;
  observacoes: string | null;
  estado_lead?: string | null;
  motivo_perda?: string | null;
  estado_final?: string | null;
  etapa: LeadEtapa;
  etapa_arrendamento?: string | null;
  tipo_processo?: string | null;
  data_entrada?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  data_limite: string | null;
  concluida: boolean;
  prioridade: "baixa" | "media" | "alta";
  lead_id: string | null;
  agente_id: string | null;
  created_at: string;
}

export interface DashboardStats {
  leadsAtivos: number;
  tarefasPendentes: number;
  negociosEmCurso: number;
  pipelinePorEtapa: Record<LeadEtapa, number>;
}

export type NewLeadInput = {
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
};

export type UpdateLeadInput = Partial<NewLeadInput> & {
  etapa?: LeadEtapa;
};
