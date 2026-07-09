import { supabase } from "@/lib/supabase/client";
import { mapLeadRow, normalizeEtapa } from "./mappers";
import type {
  Lead, NewLeadInput, UpdateLeadInput, DashboardStats, LeadEtapa,
} from "@/types";
import type { LeadRow } from "@/types/database";
import { PIPELINE_STAGES } from "@/lib/leads";

const LEAD_SELECT = `*, agentes ( nome )`;

async function selectLeads() {
  let allData: any[] = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    let result = await supabase
      .from("leads")
      .select(LEAD_SELECT)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (result.error?.message?.includes("agentes")) {
      result = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);
    }

    if (result.error) throw result.error;

    const rows = result.data ?? [];
    allData = allData.concat(rows);

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return { data: allData, error: null };
}

async function selectLeadById(id: string) {
  let result = await supabase.from("leads").select(LEAD_SELECT).eq("id", id).maybeSingle();
  if (result.error?.message?.includes("agentes")) {
    result = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  }
  return result;
}

export async function fetchLeads(): Promise<Lead[]> {
  const { data, error } = await selectLeads();
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapLeadRow(row as LeadRow));
}

export async function fetchLeadById(id: string): Promise<Lead | null> {
  const { data, error } = await selectLeadById(id);
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapLeadRow(data as LeadRow);
}

export async function createLead(input: NewLeadInput): Promise<Lead> {
  const payload = {
    nome: input.nome,
    apelido: input.apelido,
    telemovel: input.telemovel,
    email: input.email,
    tipologia: input.tipologia,
    zona_interesse: input.zona_interesse,
    origem: input.origem,
    agente_id: input.agente_id,
    temperatura: input.temperatura,
    orcamento_maximo: input.orcamento_maximo,
    observacoes: input.observacoes,
    etapa: ((input as any).etapa ?? "novo_lead") as LeadEtapa,
    estado_lead: "Activo",
    estado_final: "Activo",
    motivo_perda: (input as any).motivo_perda || null,
    tipo_processo: (input as any).tipo_processo ?? "Compra/Venda",
    data_entrada: (input as any).data_entrada || undefined,
    etapa_arrendamento: (input as any).tipo_processo === "Arrendamento" ? "novo_lead" : null,
  };
  let result = await supabase.from("leads").insert(payload).select(LEAD_SELECT).single();
  if (result.error?.message?.includes("agentes")) {
    result = await supabase.from("leads").insert(payload).select("*").single();
  }
  if (result.error) throw new Error(result.error.message);
  return mapLeadRow(result.data as LeadRow);
}

export async function updateLeadEtapa(id: string, etapa: LeadEtapa): Promise<Lead> {
  const { data: leadAtual } = await supabase.from("leads").select("*").eq("id", id).single();
  const etapaAnterior = normalizeEtapa(leadAtual?.etapa ?? leadAtual?.status);
  const updatePayload: Record<string, unknown> = { etapa, updated_at: new Date().toISOString() };
  if (etapa === "escritura_realizada") updatePayload.estado_final = "Concluído";

  let result = await supabase.from("leads").update(updatePayload).eq("id", id).select(LEAD_SELECT).single();
  if (result.error?.message?.includes("agentes")) {
    result = await supabase.from("leads").update(updatePayload).eq("id", id).select("*").single();
  }
  if (result.error) throw new Error(result.error.message);

  await supabase.from("lead_historico").insert({
    lead_id: id,
    tipo: "mudanca_etapa",
    descricao: `Etapa alterada de "${etapaAnterior}" para "${etapa}"`,
    created_at: new Date().toISOString(),
  });

  return mapLeadRow(result.data as LeadRow);
}

export async function updateLead(id: string, input: UpdateLeadInput): Promise<Lead> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.nome !== undefined) payload.nome = input.nome;
  if (input.apelido !== undefined) payload.apelido = input.apelido;
  if (input.telemovel !== undefined) payload.telemovel = input.telemovel;
  if (input.email !== undefined) payload.email = input.email;
  if (input.tipologia !== undefined) payload.tipologia = input.tipologia;
  if (input.zona_interesse !== undefined) payload.zona_interesse = input.zona_interesse;
  if (input.origem !== undefined) payload.origem = input.origem;
  if (input.agente_id !== undefined) payload.agente_id = input.agente_id;
  if (input.temperatura !== undefined) payload.temperatura = input.temperatura;
  if (input.orcamento_maximo !== undefined) payload.orcamento_maximo = input.orcamento_maximo;
  if (input.observacoes !== undefined) payload.observacoes = input.observacoes;
  if (input.etapa !== undefined) payload.etapa = input.etapa;

  let result = await supabase.from("leads").update(payload).eq("id", id).select(LEAD_SELECT).single();
  if (result.error?.message?.includes("agentes")) {
    result = await supabase.from("leads").update(payload).eq("id", id).select("*").single();
  }
  if (result.error) throw new Error(result.error.message);
  return mapLeadRow(result.data as LeadRow);
}

export async function fetchRecentLeads(limit = 4): Promise<Lead[]> {
  let result = await supabase.from("leads").select(LEAD_SELECT).order("created_at", { ascending: false }).limit(limit);
  if (result.error?.message?.includes("agentes")) {
    result = await supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(limit);
  }
  if (result.error) throw new Error(result.error.message);
  return (result.data ?? []).map((row) => mapLeadRow(row as LeadRow)).filter((lead) => {
    const estado = lead.estado_final ?? lead.estado_lead ?? "Activo";
    return estado !== "Perdido" && estado !== "Arquivado";
  });
}

export interface DashboardOperacional {
  leadsAtivos: number;
  tarefasPendentes: number;
  negociosEmCurso: number;
  pipelinePorEtapa: Record<LeadEtapa, number>;
  followupsHoje: number;
  tarefasAtrasadas: number;
  leadsSeContacto: number;
  tarefasHoje: Array<{ id: string; titulo: string; tipo?: string; lead_id: string; data_limite?: string }>;
  tarefasAtrasadasLista: Array<{ id: string; titulo: string; tipo?: string; lead_id: string; data_limite?: string }>;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  let leadsRes = await supabase.from("leads").select("etapa");
  if (leadsRes.error?.message?.includes("etapa")) {
    leadsRes = await supabase.from("leads").select("status");
  }
  const tarefasRes = await supabase.from("tarefas").select("id", { count: "exact", head: true }).eq("concluida", false);
  if (leadsRes.error) throw new Error(leadsRes.error.message);
  if (tarefasRes.error) throw new Error(tarefasRes.error.message);
  const leads = (leadsRes.data ?? []) as { etapa?: string; status?: string }[];
  const getEtapa = (l: { etapa?: string; status?: string }) => normalizeEtapa(l.etapa ?? l.status);
  const pipelinePorEtapa = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.id] = leads.filter((l) => getEtapa(l) === stage.id).length;
    return acc;
  }, {} as Record<LeadEtapa, number>);
  const leadsAtivos = leads.filter((l) => getEtapa(l) !== "escritura_realizada").length;
  const negociosEmCurso = leads.filter((l) => getEtapa(l) !== "novo_lead" && getEtapa(l) !== "escritura_realizada").length;
  return { leadsAtivos, tarefasPendentes: tarefasRes.count ?? 0, negociosEmCurso, pipelinePorEtapa };
}

export async function fetchDashboardOperacional(): Promise<DashboardOperacional> {
  const hoje = new Date();
  const hojeInicio = new Date(hoje); hojeInicio.setHours(0, 0, 0, 0);
  const hojeFim = new Date(hoje); hojeFim.setHours(23, 59, 59, 999);
  const seteDiasAtras = new Date(hoje); seteDiasAtras.setDate(hoje.getDate() - 7);

  const [leadsRes, tarefasHojeRes, tarefasAtrasadasRes, leadsSeContactoRes, tarefasPendentesRes] = await Promise.all([
    supabase.from("leads").select("etapa, estado_final, estado_lead"),
    supabase.from("tarefas").select("id, titulo, tipo, lead_id, data_limite, prioridade, concluida, leads(nome, apelido, estado_final, estado_lead)").eq("concluida", false).gte("data_limite", hojeInicio.toISOString()).lte("data_limite", hojeFim.toISOString()),
    supabase.from("tarefas").select("id, titulo, tipo, lead_id, data_limite, prioridade, concluida, leads(nome, apelido, estado_final, estado_lead)").eq("concluida", false).lt("data_limite", hojeInicio.toISOString()),
    supabase.from("leads").select("id", { count: "exact", head: true }).lt("updated_at", seteDiasAtras.toISOString()).neq("etapa", "escritura_realizada"),
    supabase.from("tarefas").select("id", { count: "exact", head: true }).eq("concluida", false),
  ]);

  const leads = (leadsRes.data ?? []) as { etapa?: string; estado_final?: string | null; estado_lead?: string | null }[];
  const getEtapa = (l: { etapa?: string }) => normalizeEtapa(l.etapa);
  const leadsOperacionais = leads.filter((l) => {
    const estado = l.estado_final ?? l.estado_lead ?? "Activo";
    return estado !== "Perdido" && estado !== "Arquivado";
  });
  const pipelinePorEtapa = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage.id] = leadsOperacionais.filter((l) => getEtapa(l) === stage.id).length;
    return acc;
  }, {} as Record<LeadEtapa, number>);

  return {
    leadsAtivos: leadsOperacionais.filter((l) => getEtapa(l) !== "escritura_realizada").length,
    tarefasPendentes: tarefasPendentesRes.count ?? 0,
    negociosEmCurso: leadsOperacionais.filter((l) => getEtapa(l) !== "novo_lead" && getEtapa(l) !== "escritura_realizada").length,
    pipelinePorEtapa,
    followupsHoje: tarefasHojeRes.data?.length ?? 0,
    tarefasAtrasadas: tarefasAtrasadasRes.data?.length ?? 0,
    leadsSeContacto: leadsSeContactoRes.count ?? 0,
    tarefasHoje: (tarefasHojeRes.data ?? []) as any,
    tarefasAtrasadasLista: (tarefasAtrasadasRes.data ?? []) as any,
  };
}