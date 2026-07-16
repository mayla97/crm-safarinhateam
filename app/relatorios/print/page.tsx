import { createClient } from "@/lib/supabase/server";
import { getEtapaLabel, formatOrcamento } from "@/lib/leads";
import { mapLeadRow } from "@/lib/supabase/mappers";
import { filterLeadsForReport, getTipoProcesso } from "@/lib/leads-report-filter";

export const dynamic = "force-dynamic";

interface PrintRelatorioPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PrintRelatorioPage({ searchParams }: PrintRelatorioPageProps) {
  const params = await searchParams;
  const getParam = (key: string) => {
    const v = params[key];
    return Array.isArray(v) ? v[0] : v ?? "";
  };

  const supabase = await createClient();

  async function fetchTodosLeads() {
    let allData: any[] = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("leads")
        .select("*, agentes(nome)")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) throw error;

      const rows = data ?? [];
      allData = allData.concat(rows);

      if (rows.length < pageSize) break;
      from += pageSize;
    }

    return allData;
  }

  const leadsData = await fetchTodosLeads();

  async function fetchTodoHistorico() {
    let allData: any[] = [];
    let from = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from("lead_historico")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + pageSize - 1);

      if (error) throw error;

      const rows = data ?? [];
      allData = allData.concat(rows);

      if (rows.length < pageSize) break;
      from += pageSize;
    }

    return allData;
  }

  const historicoData = await fetchTodoHistorico();

  // Usa exactamente o mesmo mapper que o resto da app usa (LeadsProvider),
  // para garantir que os campos (orçamento, agente, tipo de processo, etc.)
  // ficam idênticos aos usados no filtro da página de Relatórios.
  const todosLeadsMapeados = (leadsData ?? []).map((row: any) => mapLeadRow(row));
  const historico = historicoData ?? [];

  const leads = filterLeadsForReport(todosLeadsMapeados, {
    search: getParam("search"),
    tipoProcesso: getParam("tipoProcesso") || "todos",
    etapa: getParam("etapa") || "todos",
    origem: getParam("origem") || "todos",
    agente: getParam("agente") || "todos",
    tipologia: getParam("tipologia") || "todos",
    temperatura: getParam("temperatura") || "todos",
    estado: getParam("estado") || "todos",
    dataDe: getParam("dataDe"),
    dataAte: getParam("dataAte"),
    orcamentoMin: getParam("orcamentoMin"),
    orcamentoMax: getParam("orcamentoMax"),
  });

  function getNotaPerda(leadId: string) {
    
    const registo = historico.find((h: any) => {
      const texto = Object.values(h).join(" ").toLowerCase();
      return h.lead_id === leadId && texto.includes("perdid");
    }) as any;

    if (!registo) return "—";

    return (
      registo.nota ??
      registo.observacao ??
      registo.observacoes ??
      registo.descricao ??
      registo.texto ??
      registo.conteudo ??
      registo.mensagem ??
      "—"
    );
  }

  function getAgenteNome(lead: any) {
    return lead.agente_nome ?? "—";
  }
  return (
    <div id="print-report" className="min-h-screen bg-white p-10 text-black">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }

          #print-report,
          #print-report * {
            visibility: visible !important;
          }

          #print-report {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 24px !important;
            background: white !important;
          }

          .print-hide {
            display: none !important;
          }

          @page {
            size: A4 landscape;
            margin: 12mm;
          }

          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>

      <div className="print-hide mb-8 flex justify-end">
        <button
          id="print-button"
          type="button"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
        >
          Imprimir / guardar PDF
        </button>
      </div>

      <div className="mb-8 border-b border-slate-300 pb-6">
        <h1 className="text-3xl font-bold">Relatório de Leads</h1>

        <p className="mt-2 text-sm text-slate-600">CRM Sa Farinha Team</p>

        <p className="mt-1 text-sm text-slate-600">
          Gerado em {new Date().toLocaleString("pt-PT")}
        </p>

        <p className="mt-1 text-sm text-slate-600">
          Total: {leads.length} lead{leads.length === 1 ? "" : "s"}
        </p>
      </div>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b-2 border-slate-400">
            <th className="px-2 py-3 text-left">Nome</th>
            <th className="px-2 py-3 text-left">Contacto</th>
            <th className="px-2 py-3 text-left">Tipologia</th>
            <th className="px-2 py-3 text-left">Zona</th>
            <th className="px-2 py-3 text-left">Orçamento</th>
            <th className="px-2 py-3 text-left">Origem</th>
            <th className="px-2 py-3 text-left">Agente</th>
            <th className="px-2 py-3 text-left">Temperatura</th>
            <th className="px-2 py-3 text-left">Etapa</th>
            <th className="px-2 py-3 text-left">Estado</th>
            <th className="px-2 py-3 text-left">Motivo perda</th>
            <th className="px-2 py-3 text-left">Nota perda</th>
          </tr>
        </thead>

        <tbody>
          {leads.map((lead: any) => {
            const estado = lead.estado_final ?? lead.estado_lead ?? "Activo";

            return (
              <tr key={lead.id} className="border-b border-slate-200 align-top">
                <td className="px-2 py-3">
                  {lead.nome} {lead.apelido ?? ""}
                </td>

                <td className="px-2 py-3">
                  <div>{lead.email ?? "—"}</div>
                  <div className="text-slate-500">{lead.telemovel ?? "—"}</div>
                </td>

                <td className="px-2 py-3">{lead.tipologia ?? "—"}</td>
                <td className="px-2 py-3">{lead.zona_interesse ?? "—"}</td>
                <td className="px-2 py-3">{formatOrcamento(lead.orcamento_maximo)}</td>
                <td className="px-2 py-3">{lead.origem ?? "—"}</td>
                <td className="px-2 py-3">
                {getAgenteNome(lead)}
</td>
                <td className="px-2 py-3">{lead.temperatura ?? "—"}</td>
                <td className="px-2 py-3">{getEtapaLabel(lead.etapa)}</td>
                <td className="px-2 py-3">{estado}</td>
                <td className="px-2 py-3">{lead.motivo_perda ?? "—"}</td>
                <td className="px-2 py-3">{getNotaPerda(lead.id)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.getElementById("print-button")?.addEventListener("click", function () {
              window.print();
            });
          `,
        }}
      />
    </div>
  );
}