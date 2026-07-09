import type { Lead, Agente, LeadEtapa } from "@/types";
import type { LeadRow, AgenteRow } from "@/types/database";

const ETAPAS_VALIDAS: LeadEtapa[] = [
  "novo_lead",
  "em_tratamento",
  "qualificado",
  "visita_agendada",
  "visita_realizada",
  "negociacao",
  "cpcv_enviado",
  "cpcv_assinado",
  "aguarda_escritura",
  "escritura_realizada",
];

export function normalizeEtapa(value: string | null | undefined): LeadEtapa {
  if (value && ETAPAS_VALIDAS.includes(value as LeadEtapa)) {
    return value as LeadEtapa;
  }
  return "novo_lead";
}

export function mapLeadRow(row: LeadRow & Record<string, unknown>): Lead {
  const etapaRaw =
    (row.etapa as string) ?? (row.status as string) ?? "novo_lead";

  const agentes = row.agentes as { nome: string } | { nome: string }[] | null;

  let agenteNome: string | null = null;

  if (agentes) {
    agenteNome = Array.isArray(agentes)
      ? agentes[0]?.nome ?? null
      : agentes.nome;
  }

  if (!agenteNome && typeof row.agente === "string") {
    agenteNome = row.agente;
  }

  return {
    id: row.id,
    nome: row.nome,
    apelido: row.apelido ?? null,
    telemovel: row.telemovel ?? null,
    email: row.email ?? null,
    tipologia: row.tipologia ?? null,
    zona_interesse: row.zona_interesse ?? null,
    origem: row.origem ?? null,
    agente_id: row.agente_id ?? null,
    agente_nome: agenteNome,
    temperatura: row.temperatura ?? null,
    orcamento_maximo:
      row.orcamento_maximo != null ? Number(row.orcamento_maximo) : null,
    observacoes: row.observacoes ?? null,
    estado_lead: (row.estado_lead as string) ?? null,
    estado_final: (row.estado_final as string) ?? null,
    motivo_perda: (row.motivo_perda as string) ?? null,
    etapa: normalizeEtapa(etapaRaw),
    etapa_arrendamento:
  ((row as any).etapa_arrendamento as string) ?? "novo_lead",

tipo_processo:
  ((row as any).tipo_processo as string) ?? "Compra/Venda",
    created_at: row.created_at,
    updated_at: row.updated_at,
    data_entrada: ((row as any).data_entrada as string) ?? null,
  };
}

export function mapAgenteRow(row: AgenteRow): Agente {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email ?? null,
    telemovel: row.telemovel ?? null,
    ativo: row.ativo ?? null,
    created_at: row.created_at,
  };
}