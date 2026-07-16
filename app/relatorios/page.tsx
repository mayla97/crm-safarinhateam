"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Search, Printer } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useLeads } from "@/components/leads/LeadsProvider";
import {
  getLeadDisplayName,
  getEtapaLabel,
  formatOrcamento,
  ORIGENS,
  TIPOLOGIAS,
  TEMPERATURAS,
} from "@/lib/leads";

const ETAPAS_ARRENDAMENTO: Record<string, string> = {
  novo_lead: "Novo lead",
  em_tratamento: "Em tratamento",
  visita_agendada: "Visita agendada",
  visita_realizada: "Visita realizada",
  documentacao_recebida: "Documentação recebida",
  proposta_apresentada: "Proposta apresentada",
  contrato_assinado: "Contrato assinado",
};

function parseDataFlexivel(valor: unknown): number | null {
  if (!valor) return null;
  const texto = String(valor).trim();
  if (!texto) return null;

  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(texto)) {
    const t = new Date(texto).getTime();
    if (!isNaN(t)) return t;
  }

  const match = texto.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) {
    const [, dia, mes, ano] = match;
    const t = new Date(`${ano}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}T00:00:00`).getTime();
    if (!isNaN(t)) return t;
  }

  const fallback = new Date(texto).getTime();
  return isNaN(fallback) ? null : fallback;
}

export default function RelatoriosPage() {
  const { leads } = useLeads();

  const [search, setSearch] = useState("");
  const [tipoProcesso, setTipoProcesso] = useState("todos");
  const [etapa, setEtapa] = useState("todos");
  const [origem, setOrigem] = useState("todos");
  const [tipologia, setTipologia] = useState("todos");
  const [temperatura, setTemperatura] = useState("todos");
  const [estado, setEstado] = useState("todos");
  const [agente, setAgente] = useState("todos");
  const [dataDe, setDataDe] = useState("");
  const [dataAte, setDataAte] = useState("");
  const [orcamentoMin, setOrcamentoMin] = useState("");
  const [orcamentoMax, setOrcamentoMax] = useState("");

  const getEstado = (lead: any) =>
    lead.estado_final ?? lead.estado_lead ?? "Activo";

  const getTipoProcesso = (lead: any) =>
    lead.tipo_processo ?? "Compra/Venda";

  const getDataEntrada = (lead: any) => lead.data_entrada ?? lead.created_at;
  const getDataEntradaTs = (lead: any) =>
    parseDataFlexivel(lead.data_entrada) ?? parseDataFlexivel(lead.created_at);

  const getEtapaRelatorio = (lead: any) => {
    if (getTipoProcesso(lead) === "Arrendamento") {
      const etapaArrendamento = lead.etapa_arrendamento ?? "novo_lead";
      return ETAPAS_ARRENDAMENTO[etapaArrendamento] ?? etapaArrendamento;
    }

    return getEtapaLabel(lead.etapa);
  };

  const filtrados = useMemo(() => {
    const dataDeTs = dataDe ? new Date(dataDe + "T00:00:00").getTime() : null;
    const dataAteTs = dataAte ? new Date(dataAte + "T23:59:59").getTime() : null;

    const resultado = leads.filter((lead: any) => {
      const termo = search.toLowerCase();
      const nome = getLeadDisplayName(lead).toLowerCase();
      const estadoLead = getEstado(lead);
      const tipo = getTipoProcesso(lead);

      const dataLeadTs = getDataEntradaTs(lead);

      const dentroDoIntervalo =
        (!dataDeTs || (dataLeadTs !== null && dataLeadTs >= dataDeTs)) &&
        (!dataAteTs || (dataLeadTs !== null && dataLeadTs <= dataAteTs));

      const orcamentoLead =
        lead.orcamento_maximo != null ? Number(lead.orcamento_maximo) : null;
      const minNum = orcamentoMin ? Number(orcamentoMin) : null;
      const maxNum = orcamentoMax ? Number(orcamentoMax) : null;

      const dentroDoOrcamento =
        (!minNum || (orcamentoLead !== null && orcamentoLead >= minNum)) &&
        (!maxNum || (orcamentoLead !== null && orcamentoLead <= maxNum));

      return (
        (nome.includes(termo) ||
          (lead.email ?? "").toLowerCase().includes(termo) ||
          (lead.telemovel ?? "").includes(search) ||
          (lead.zona_interesse ?? "").toLowerCase().includes(termo)) &&
        (tipoProcesso === "todos" || tipo === tipoProcesso) &&
        (etapa === "todos" ||
          lead.etapa === etapa ||
          lead.etapa_arrendamento === etapa) &&
        (origem === "todos" || lead.origem === origem) &&
        (agente === "todos" ||
          lead.agente_nome === agente ||
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
  }, [
    leads,
    search,
    tipoProcesso,
    etapa,
    origem,
    agente,
    tipologia,
    temperatura,
    estado,
    orcamentoMin,
    orcamentoMax,
    dataDe,
    dataAte,
  ]);

  const concluidos = filtrados.filter(
    (lead: any) => getEstado(lead) === "Concluído"
  ).length;

  const perdidos = filtrados.filter(
    (lead: any) => getEstado(lead) === "Perdido"
  ).length;

  const activos = filtrados.filter((lead: any) => {
    const estadoLead = getEstado(lead);
    return estadoLead !== "Perdido" && estadoLead !== "Concluído";
  }).length;

  const baseConversao = concluidos + perdidos;

  const taxaConversao =
    baseConversao === 0
      ? 0
      : Math.round((concluidos / baseConversao) * 100);

  const motivosPerda = (() => {
    const map = new Map<string, number>();

    filtrados.forEach((lead: any) => {
      if (getEstado(lead) === "Perdido" && lead.motivo_perda) {
        map.set(lead.motivo_perda, (map.get(lead.motivo_perda) ?? 0) + 1);
      }
    });

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  })();

  const topOrigens = (() => {
    const map = new Map<string, number>();

    filtrados.forEach((lead: any) => {
      const origemLead = lead.origem ?? "Sem origem";
      map.set(origemLead, (map.get(origemLead) ?? 0) + 1);
    });

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  })();

  const desempenhoOrigens = (() => {
    const map = new Map<
      string,
      {
        leads: number;
        concluidos: number;
        perdidos: number;
      }
    >();

    filtrados.forEach((lead: any) => {
      const origemNome = lead.origem ?? "Sem origem";

      if (!map.has(origemNome)) {
        map.set(origemNome, {
          leads: 0,
          concluidos: 0,
          perdidos: 0,
        });
      }

      const item = map.get(origemNome)!;

      item.leads += 1;

      if (getEstado(lead) === "Concluído") {
        item.concluidos += 1;
      }

      if (getEstado(lead) === "Perdido") {
        item.perdidos += 1;
      }
    });

    return Array.from(map.entries())
      .map(([origemNome, dados]) => {
        const base = dados.concluidos + dados.perdidos;

        return {
          origem: origemNome,
          leads: dados.leads,
          concluidos: dados.concluidos,
          perdidos: dados.perdidos,
          conversao:
            base === 0
              ? 0
              : Math.round((dados.concluidos / base) * 100),
        };
      })
      .sort((a, b) => b.leads - a.leads);
  })();

  const agentesDisponiveis = Array.from(
    new Set(
      leads
        .map((lead: any) => lead.agente_nome)
        .filter(Boolean)
    )
  ).sort();

  const exportarCSV = () => {
    const headers = [
      "Data de entrada",
      "Nome",
      "Email",
      "Telemóvel",
      "Tipo de processo",
      "Tipologia",
      "Zona",
      "Orçamento/Renda máximo",
      "Origem",
      "Agente",
      "Temperatura",
      "Etapa",
      "Estado",
      "Motivo da perda",
    ];

    const rows = filtrados.map((lead: any) => {
      const ts = getDataEntradaTs(lead);
      return [
        ts ? new Date(ts).toLocaleDateString("pt-PT") : "",
        getLeadDisplayName(lead),
        lead.email ?? "",
        lead.telemovel ?? "",
        getTipoProcesso(lead),
        lead.tipologia ?? "",
        lead.zona_interesse ?? "",
        lead.orcamento_maximo != null ? String(lead.orcamento_maximo) : "",
        lead.origem ?? "",
        lead.agente_nome ?? "",
        lead.temperatura ?? "",
        getEtapaRelatorio(lead),
        getEstado(lead),
        lead.motivo_perda ?? "",
      ];
    });

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "relatorio-leads.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const limparFiltros = () => {
    setSearch("");
    setTipoProcesso("todos");
    setEtapa("todos");
    setOrigem("todos");
    setAgente("todos");
    setTipologia("todos");
    setTemperatura("todos");
    setEstado("todos");
    setDataDe("");
    setDataAte("");
    setOrcamentoMin("");
    setOrcamentoMax("");
  };

  return (
    <div>
      <PageHeader
        title="Relatórios"
        description="Gere relatórios filtrados dos leads"
      >
        <button
          type="button"
          onClick={() => window.open("/relatorios/print", "_blank")}
          className="btn-secondary"
        >
          <Printer className="h-4 w-4" />
          Visualizar / imprimir
        </button>

        <button type="button" onClick={exportarCSV} className="btn-primary">
          <Download className="h-4 w-4" />
          Exportar relatório
        </button>
      </PageHeader>

      <div className="mb-6 grid gap-6 xl:grid-cols-4">
        <div className="card p-5">
          <p className="text-sm font-medium text-brand-muted">
            Taxa de conversão
          </p>
          <p className="mt-3 text-3xl font-bold text-remax-blue-dark">
            {taxaConversao}%
          </p>
          <p className="mt-1 text-xs text-brand-muted">
            concluídos / concluídos + perdidos
          </p>
        </div>

        <div className="card p-5">
          <p className="text-sm font-medium text-brand-muted">Leads activos</p>
          <p className="mt-3 text-3xl font-bold text-remax-blue-dark">
            {activos}
          </p>
          <p className="mt-1 text-xs text-brand-muted">
            dentro dos filtros aplicados
          </p>
        </div>

        <div className="card p-5">
          <p className="text-sm font-medium text-brand-muted">
            Motivos de perda
          </p>

          <div className="mt-3 space-y-2 text-sm">
            {motivosPerda.length === 0 ? (
              <p className="text-brand-muted">Sem dados</p>
            ) : (
              motivosPerda.map(([motivo, total]) => (
                <div key={motivo} className="flex justify-between">
                  <span className="text-slate-600">{motivo}</span>
                  <span className="font-semibold text-remax-blue-dark">
                    {total}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-5">
          <p className="text-sm font-medium text-brand-muted">Top origens</p>

          <div className="mt-3 space-y-2 text-sm">
            {topOrigens.length === 0 ? (
              <p className="text-brand-muted">Sem dados</p>
            ) : (
              topOrigens.map(([origemNome, total]) => (
                <div key={origemNome} className="flex justify-between">
                  <span className="text-slate-600">{origemNome}</span>
                  <span className="font-semibold text-remax-blue-dark">
                    {total}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card mb-6 p-5 print:hidden">
        <div className="mb-4 flex items-center gap-2">
          <FileText className="h-5 w-5 text-remax-blue" />
          <h2 className="font-semibold text-remax-blue-dark">
            Filtros do relatório
          </h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Nome, telefone, email ou zona..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-remax-blue"
            />
          </div>

          <select
            value={tipoProcesso}
            onChange={(e) => setTipoProcesso(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="todos">Todos processos</option>
            <option value="Compra/Venda">Compra/Venda</option>
            <option value="Arrendamento">Arrendamento</option>
          </select>

          <select
            value={etapa}
            onChange={(e) => setEtapa(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="todos">Todas etapas</option>
            <option value="novo_lead">Novo lead</option>
            <option value="em_tratamento">Em tratamento</option>
            <option value="qualificado">Qualificado</option>
            <option value="visita_agendada">Visita agendada</option>
            <option value="visita_realizada">Visita realizada</option>
            <option value="negociacao">Negociação</option>
            <option value="cpcv_assinado">CPCV assinado</option>
            <option value="aguarda_escritura">Aguarda escritura</option>
            <option value="escritura_realizada">Escritura realizada</option>
            <option value="documentacao_recebida">
              Documentação recebida
            </option>
            <option value="proposta_apresentada">
              Proposta apresentada
            </option>
            <option value="contrato_assinado">Contrato assinado</option>
          </select>

          <select
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="todos">Todas origens</option>
            {ORIGENS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>

          <select
            value={agente}
            onChange={(e) => setAgente(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="todos">Todos agentes</option>
            {agentesDisponiveis.map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </select>

          <select
            value={tipologia}
            onChange={(e) => setTipologia(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="todos">Todas tipologias</option>
            {TIPOLOGIAS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={temperatura}
            onChange={(e) => setTemperatura(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="todos">Todas temperaturas</option>
            {TEMPERATURAS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="todos">Todos estados</option>
            <option value="activos">Só activos</option>
            <option value="Activo">Activo</option>
            <option value="Perdido">Perdido</option>
            <option value="Pausado">Pausado</option>
            <option value="Concluído">Concluído</option>
          </select>

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-brand-muted">
              Data de entrada — De
            </label>
            <input
              type="date"
              value={dataDe}
              onChange={(e) => setDataDe(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-brand-muted">
              Data de entrada — Até
            </label>
            <input
              type="date"
              value={dataAte}
              onChange={(e) => setDataAte(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-brand-muted">
              Orçamento — Mínimo
            </label>
            <input
              type="number"
              placeholder="0"
              value={orcamentoMin}
              onChange={(e) => setOrcamentoMin(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col">
            <label className="mb-1 text-xs font-medium text-brand-muted">
              Orçamento — Máximo
            </label>
            <input
              type="number"
              placeholder="Sem limite"
              value={orcamentoMax}
              onChange={(e) => setOrcamentoMax(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-brand-muted">
            {filtrados.length} lead{filtrados.length === 1 ? "" : "s"} no
            relatório
          </p>

          <button
            type="button"
            onClick={limparFiltros}
            className="text-sm font-medium text-remax-blue hover:text-remax-red"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      <div className="card mb-6 overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-remax-blue-dark">
            Desempenho por origem
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-6 py-3 text-left">Origem</th>
                <th className="px-6 py-3 text-left">Leads</th>
                <th className="px-6 py-3 text-left">Concluídos</th>
                <th className="px-6 py-3 text-left">Perdidos</th>
                <th className="px-6 py-3 text-left">Conversão</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {desempenhoOrigens.map((item) => (
                <tr key={item.origem}>
                  <td className="px-6 py-4">{item.origem}</td>
                  <td className="px-6 py-4">{item.leads}</td>
                  <td className="px-6 py-4">{item.concluidos}</td>
                  <td className="px-6 py-4">{item.perdidos}</td>
                  <td className="px-6 py-4 font-semibold">
                    {item.conversao}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-remax-blue-dark">
            Resultado do relatório
          </h2>
          <p className="mt-1 text-sm text-brand-muted">
            {filtrados.length} lead{filtrados.length === 1 ? "" : "s"}{" "}
            encontrado{filtrados.length === 1 ? "" : "s"}
          </p>
        </div>

        {filtrados.length === 0 ? (
          <div className="py-16 text-center text-brand-muted">
            Nenhum lead encontrado com estes filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm table-fixed">
              <colgroup>
                <col className="w-24" />
                <col className="w-44" />
                <col className="w-52" />
                <col className="w-24" />
                <col className="w-28" />
                <col className="w-32" />
                <col className="w-28" />
                <col className="w-32" />
                <col className="w-28" />
                <col className="w-28" />
                <col className="w-40" />
                <col className="w-24" />
                <col className="w-36" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">
                    Tipologia
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">
                    Zona
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">
                    Orçamento
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">
                    Origem
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">
                    Agente
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">
                    Temperatura
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">
                    Etapa
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">
                    Motivo perda
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtrados.map((lead: any) => (
                  <tr key={lead.id}>
                    <td className="px-6 py-4 text-xs text-brand-muted whitespace-nowrap">
                      {getDataEntradaTs(lead)
                        ? new Date(getDataEntradaTs(lead)!).toLocaleDateString("pt-PT")
                        : "—"}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800 truncate" title={getLeadDisplayName(lead)}>
                      {getLeadDisplayName(lead)}
                    </td>
                    <td className="px-6 py-4 text-brand-muted">
                      <div className="truncate" title={lead.email ?? "—"}>{lead.email ?? "—"}</div>
                      <div className="text-xs truncate">{lead.telemovel ?? "—"}</div>
                    </td>
                    <td className="px-6 py-4 text-brand-muted truncate">
                      {getTipoProcesso(lead)}
                    </td>
                    <td className="px-6 py-4 text-brand-muted truncate">
                      {lead.tipologia ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-brand-muted truncate">
                      {lead.zona_interesse ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-brand-muted truncate">
                      {formatOrcamento(lead.orcamento_maximo)}
                    </td>
                    <td className="px-6 py-4 text-brand-muted truncate">
                      {lead.origem ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-brand-muted truncate">
                      {lead.agente_nome ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-brand-muted truncate">
                      {lead.temperatura ?? "—"}
                    </td>
                    <td className="px-6 py-4 text-brand-muted truncate">
                      {getEtapaRelatorio(lead)}
                    </td>
                    <td className="px-6 py-4 text-brand-muted truncate">
                      {getEstado(lead)}
                    </td>
                    <td className="px-6 py-4 text-brand-muted truncate">
                      {lead.motivo_perda ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}