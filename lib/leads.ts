import type { Lead, LeadEtapa } from "@/types";

export const ETAPA_LABELS: Record<LeadEtapa, string> = {
  novo_lead: "Novo lead",
  em_tratamento: "Em tratamento",
  qualificado: "Qualificado",
  visita_agendada: "Visita agendada",
  visita_realizada: "Visita realizada",
  negociacao: "Negociação",
  cpcv_enviado: "CPCV enviado",
  cpcv_assinado: "CPCV assinado",
  aguarda_escritura: "Aguarda escritura",
  escritura_realizada: "Escritura realizada",
};

export const PIPELINE_STAGES: {
  id: LeadEtapa;
  title: string;
  color: string;
}[] = [
  { id: "novo_lead", title: "Novo lead", color: "bg-slate-500" },
  { id: "em_tratamento", title: "Em tratamento", color: "bg-remax-blue" },
  { id: "qualificado", title: "Qualificado", color: "bg-blue-500" },
  { id: "visita_agendada", title: "Visita agendada", color: "bg-amber-500" },
  { id: "visita_realizada", title: "Visita realizada", color: "bg-orange-500" },
  { id: "negociacao", title: "Negociação", color: "bg-orange-600" },
  { id: "cpcv_assinado", title: "CPCV assinado", color: "bg-emerald-500" },
  { id: "aguarda_escritura", title: "Aguarda escritura", color: "bg-emerald-600" },
  { id: "escritura_realizada", title: "Escritura realizada", color: "bg-green-700" },
];

export const ETAPA_BADGE: Record<string, string> = {
  "Novo lead": "badge-red",
  "Em tratamento": "badge-blue",
  Qualificado: "badge-green",
  "Visita agendada": "badge-amber",
  "Visita realizada": "badge-amber",
  Negociação: "badge-amber",
  "CPCV enviado": "badge-blue",
  "CPCV assinado": "badge-green",
  "Aguarda escritura": "badge-green",
  "Escritura realizada": "badge-green",
};

export const ORIGENS = [
  "Site Remax",
  "Idealista",
  "Rede Social",
  "Escala",
  "Posicionamento",
  "Conhecimento Pessoal",
  "Imovirtual",
] as const;

export const TIPOLOGIAS = [
  "T0",
  "T1",
  "T2",
  "T3",
  "T4",
  "T5+",
  "Moradia",
  "Loja",
  "Escritório",
  "Terreno",
  "Outro",
] as const;

export const TEMPERATURAS: {
  value: import("@/types").LeadTemperatura;
  label: string;
}[] = [
  { value: "frio", label: "Frio" },
  { value: "morno", label: "Morno" },
  { value: "quente", label: "Quente" },
];

export function getLeadDisplayName(lead: Lead): string {
  return [lead.nome, lead.apelido].filter(Boolean).join(" ");
}

export function getEtapaLabel(etapa: LeadEtapa): string {
  return ETAPA_LABELS[etapa];
}

export function formatOrcamento(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("pt-PT", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function getTemperaturaLabel(
  temp: import("@/types").LeadTemperatura | null
): string {
  if (!temp) return "—";
  return TEMPERATURAS.find((t) => t.value === temp)?.label ?? temp;
}

export function getLeadById(leads: Lead[], id: string): Lead | undefined {
  return leads.find((l) => l.id === id);
}

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return "há poucos minutos";
  if (hours < 24) return `há ${hours}h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "há 1d";

  return `há ${days}d`;
}