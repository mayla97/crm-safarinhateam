import type { Lead } from "@/types";

export interface RelatorioFiltros {
  search?: string;
  tipoProcesso?: string;
  etapa?: string;
  origem?: string;
  agente?: string;
  tipologia?: string;
  temperatura?: string;
  estado?: string;
  dataDe?: string;
  dataAte?: string;
  orcamentoMin?: string;
  orcamentoMax?: string;
}

export function parseDataFlexivel(valor: unknown): number | null {
  if (!valor) return null;
  const texto = String(valor).trim();
  if (!texto) return null;

  // ISO (YYYY-MM-DD ou timestamp completo)
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(texto)) {
    const t = new Date(texto).getTime();
    if (!isNaN(t)) return t;
  }

  // DD/MM/YYYY ou DD-MM-YYYY
  const match = texto.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) {
    const [, dia, mes, ano] = match;
    const t = new Date(`${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}T00:00:00`).getTime();
    if (!isNaN(t)) return t;
  }

  const fallback = new Date(texto).getTime();
  return isNaN(fallback) ? null : fallback;
}

export function getEstado(lead: any): string {
  return lead.estado_final ?? lead.estado_lead ?? "Activo";
}

export function getTipoProcesso(lead: any): string {
  return lead.tipo_processo ?? "Compra/Venda";
}

export function getDataEntradaTs(lead: any): number | null {
  return parseDataFlexivel(lead.data_entrada) ?? parseDataFlexivel(lead.created_at);
}

export function getNomeCompleto(lead: any): string {
  return `${lead.nome ?? ""} ${lead.apelido ?? ""}`.trim();
}

/**
 * Função ÚNICA de filtragem de leads para relatórios.
 * Usada tanto pela página de Relatórios (cliente) como pela página de
 * Impressão (servidor) para garantir que os dois sítios mostram sempre
 * exactamente os mesmos leads com os mesmos filtros.
 */
export function filterLeadsForReport(leads: any[], filtros: RelatorioFiltros): any[] {
  const search = (filtros.search ?? "").trim().toLowerCase();
  const tipoProcesso = filtros.tipoProcesso || "todos";
  const etapa = filtros.etapa || "todos";
  const origem = filtros.origem || "todos";
  const agente = filtros.agente || "todos";
  const tipologia = filtros.tipologia || "todos";
  const temperatura = filtros.temperatura || "todos";
  const estado = filtros.estado || "todos";
  const dataDe = filtros.dataDe || "";
  const dataAte = filtros.dataAte || "";
  const orcamentoMin = filtros.orcamentoMin || "";
  const orcamentoMax = filtros.orcamentoMax || "";

  const dataDeTs = dataDe ? new Date(dataDe + "T00:00:00").getTime() : null;
  const dataAteTs = dataAte ? new Date(dataAte + "T23:59:59").getTime() : null;
  const minNum = orcamentoMin !== "" ? Number(orcamentoMin) : null;
  const maxNum = orcamentoMax !== "" ? Number(orcamentoMax) : null;

  const resultado = leads.filter((lead: any) => {
    const nome = getNomeCompleto(lead).toLowerCase();
    const estadoLead = getEstado(lead);
    const tipo = getTipoProcesso(lead);
    const agenteNome = lead.agente_nome ?? "";

    const dataLeadTs = getDataEntradaTs(lead);
    const dentroDoIntervalo =
      (!dataDeTs || (dataLeadTs !== null && dataLeadTs >= dataDeTs)) &&
      (!dataAteTs || (dataLeadTs !== null && dataLeadTs <= dataAteTs));

    const orcamentoLeadRaw = lead.orcamento_maximo;
    const orcamentoLead =
      orcamentoLeadRaw !== null && orcamentoLeadRaw !== undefined && orcamentoLeadRaw !== ""
        ? Number(orcamentoLeadRaw)
        : null;
    const dentroDoOrcamento =
      (minNum === null || (orcamentoLead !== null && !isNaN(orcamentoLead) && orcamentoLead >= minNum)) &&
      (maxNum === null || (orcamentoLead !== null && !isNaN(orcamentoLead) && orcamentoLead <= maxNum));

    return (
      (!search ||
        nome.includes(search) ||
        (lead.email ?? "").toLowerCase().includes(search) ||
        (lead.telemovel ?? "").includes(search) ||
        (lead.zona_interesse ?? "").toLowerCase().includes(search)) &&
      (tipoProcesso === "todos" || tipo === tipoProcesso) &&
      (etapa === "todos" ||
        lead.etapa === etapa ||
        lead.etapa_arrendamento === etapa) &&
      (origem === "todos" || lead.origem === origem) &&
      (agente === "todos" ||
        agenteNome === agente ||
        lead.agente_id === agente) &&
      (tipologia === "todos" || lead.tipologia === tipologia) &&
      (temperatura === "todos" || lead.temperatura === temperatura) &&
      (estado === "todos" ||
        (estado === "activos" &&
          estadoLead !== "Perdido" &&
          estadoLead !== "Concluído") ||
        estadoLead === estado) &&
      dentroDoIntervalo &&
      dentroDoOrcamento
    );
  });

  return resultado.sort((a: any, b: any) => {
    const dataATs = getDataEntradaTs(a) ?? 0;
    const dataBTs = getDataEntradaTs(b) ?? 0;
    return dataBTs - dataATs; // mais recentes primeiro
  });
}