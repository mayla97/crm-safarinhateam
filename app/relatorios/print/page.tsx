import { createClient } from "@/lib/supabase/server";
import { getEtapaLabel } from "@/lib/leads";

export const dynamic = "force-dynamic";

export default async function PrintRelatorioPage() {
  const supabase = await createClient();

  const { data: leadsData } = await supabase
  .from("leads")
  .select("*, agentes(nome)")
  .order("created_at", { ascending: false });

  const { data: historicoData } = await supabase
    .from("lead_historico")
    .select("*")
    .order("created_at", { ascending: false });

  const leads = leadsData ?? [];
  const historico = historicoData ?? [];

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
    const agentes = lead.agentes;
  
    if (!agentes) return "—";
  
    if (Array.isArray(agentes)) {
      return agentes[0]?.nome ?? "—";
    }
  
    return agentes.nome ?? "—";
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