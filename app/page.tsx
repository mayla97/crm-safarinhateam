import Link from "next/link";
import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  UserX,
  FileCheck2,
  UserPlus,
  Calendar,
  Home,
  Building2,
} from "lucide-react";
import {
  fetchDashboardOperacional,
  fetchRecentLeads,
} from "@/lib/supabase/leads";
import {
  getEtapaLabel,
  ETAPA_BADGE,
  getLeadDisplayName,
  formatRelativeTime,
} from "@/lib/leads";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TarefaResumo = {
  id: string;
  titulo: string;
  tipo?: string;
  lead_id: string;
  data_limite?: string;
  prioridade?: string;
  leads?: { nome?: string; apelido?: string } | null;
};

async function concluirTarefa(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const supabase = await createClient();

  await supabase.from("tarefas").update({ concluida: true }).eq("id", id);

  revalidatePath("/");
  redirect("/");
}

function formatHora(data?: string) {
  if (!data) return "Sem hora";
  return new Date(data).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDataHora(data?: string | null) {
  if (!data) return "Sem data agendada";
  const d = new Date(data);
  const hoje = new Date();
  const amanha = new Date();
  amanha.setDate(hoje.getDate() + 1);

  const mesmoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const hora = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

  if (mesmoDia(d, hoje)) return `Hoje, ${hora}`;
  if (mesmoDia(d, amanha)) return `Amanhã, ${hora}`;
  return `${d.toLocaleDateString("pt-PT")}, ${hora}`;
}

export default async function DashboardPage() {
  noStore();

  let stats = {
    leadsAtivos: 0,
    tarefasPendentes: 0,
    negociosEmCurso: 0,
    pipelinePorEtapa: {} as Record<string, number>,
    followupsHoje: 0,
    tarefasAtrasadas: 0,
    leadsSeContacto: 0,
    tarefasHoje: [] as TarefaResumo[],
    tarefasAtrasadasLista: [] as TarefaResumo[],
  };

  let recentLeads: Awaited<ReturnType<typeof fetchRecentLeads>> = [];
  let escriturasEsteMes = 0;
  let leadsNovosEstaSemana = 0;
  let nomeUtilizador = "";
  let proximasVisitas: Array<{
    leadId: string;
    nome: string;
    dataLimite: string | null;
  }> = [];
  let loadError: string | null = null;

  try {
    const supabase = await createClient();

    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    const [
      statsData,
      recentData,
      escriturasMesRes,
      leadsNovosRes,
      leadsVisitaRes,
      userRes,
    ] = await Promise.all([
      fetchDashboardOperacional(),
      fetchRecentLeads(4),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .or("estado_final.eq.Concluído,estado_lead.eq.Concluído")
        .gte("updated_at", inicioMes.toISOString()),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", seteDiasAtras.toISOString()),
      supabase
        .from("leads")
        .select("id, nome, apelido, etapa, etapa_arrendamento, estado_final, estado_lead")
        .or("etapa.eq.visita_agendada,etapa_arrendamento.eq.visita_agendada"),
      supabase.auth.getUser(),
    ]);

    stats = statsData;
    recentLeads = recentData;
    escriturasEsteMes = escriturasMesRes.count ?? 0;
    leadsNovosEstaSemana = leadsNovosRes.count ?? 0;

    if (userRes.data?.user) {
      const { data: perfil } = await supabase
        .from("perfis")
        .select("nome")
        .eq("id", userRes.data.user.id)
        .single();
      nomeUtilizador = perfil?.nome?.split(" ")[0] ?? "";
    }

    const leadsEmVisita = (leadsVisitaRes.data ?? []).filter((lead: any) => {
      const estado = lead.estado_final ?? lead.estado_lead ?? "Activo";
      return estado !== "Perdido" && estado !== "Concluído";
    });

    const datasPorLead = new Map<string, string | null>();
    if (leadsEmVisita.length > 0) {
      const { data: tarefasData } = await supabase
        .from("tarefas")
        .select("lead_id, data_limite, concluida, tipo")
        .in("lead_id", leadsEmVisita.map((l: any) => l.id))
        .eq("concluida", false)
        .eq("tipo", "Confirmar visita")
        .order("data_limite", { ascending: true });

      (tarefasData ?? []).forEach((t: any) => {
        if (!datasPorLead.has(t.lead_id)) datasPorLead.set(t.lead_id, t.data_limite ?? null);
      });
    }

    proximasVisitas = leadsEmVisita
      .map((lead: any) => ({
        leadId: lead.id,
        nome: `${lead.nome ?? ""} ${lead.apelido ?? ""}`.trim(),
        dataLimite: datasPorLead.get(lead.id) ?? null,
      }))
      .sort((a, b) => {
        if (!a.dataLimite && !b.dataLimite) return 0;
        if (!a.dataLimite) return 1;
        if (!b.dataLimite) return -1;
        return new Date(a.dataLimite).getTime() - new Date(b.dataLimite).getTime();
      })
      .slice(0, 5);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Erro ao carregar dados";
  }

  // "O que fazer hoje" junta tarefas atrasadas + tarefas de hoje numa única
  // lista cronológica — visitas já entram aqui automaticamente, porque
  // também são tarefas (tipo "Confirmar visita").
  const tarefasUnificadas = [
    ...stats.tarefasAtrasadasLista.map((t) => ({ ...t, atrasada: true })),
    ...stats.tarefasHoje.map((t) => ({ ...t, atrasada: false })),
  ];

  const totalHoje = stats.tarefasHoje.length;
  const totalAtrasadas = stats.tarefasAtrasadasLista.length;
  const totalVisitasProximas = proximasVisitas.length;

  return (
    <div>
      {loadError && (
        <div className="mb-6 rounded-lg border border-remax-red/30 bg-remax-red-light px-4 py-3 text-sm text-remax-red">
          {loadError}
        </div>
      )}

      {/* Cabeçalho pessoal — o "hoje" resumido numa frase, em vez de
          números soltos sem contexto de tempo. */}
      <div className="mb-8 rounded-2xl bg-remax-blue-dark px-8 py-7 text-white">
        <h1 className="text-2xl font-bold">
          {nomeUtilizador ? `Olá, ${nomeUtilizador}` : "Olá"}
        </h1>
        <p className="mt-1 text-white/70">
          {totalAtrasadas > 0 && (
            <span className="font-medium text-remax-red">
              {totalAtrasadas} tarefa{totalAtrasadas === 1 ? "" : "s"} atrasada{totalAtrasadas === 1 ? "" : "s"}
            </span>
          )}
          {totalAtrasadas > 0 && (totalHoje > 0 || totalVisitasProximas > 0) && " · "}
          {totalHoje > 0 && `${totalHoje} tarefa${totalHoje === 1 ? "" : "s"} hoje`}
          {totalHoje > 0 && totalVisitasProximas > 0 && " · "}
          {totalVisitasProximas > 0 &&
            `${totalVisitasProximas} visita${totalVisitasProximas === 1 ? "" : "s"} agendada${totalVisitasProximas === 1 ? "" : "s"}`}
          {totalAtrasadas === 0 && totalHoje === 0 && totalVisitasProximas === 0 &&
            "Sem tarefas nem visitas pendentes — dia livre."}
        </p>
      </div>

      <div className="mb-6 grid gap-6 sm:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-brand-muted">Escrituras este mês</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50">
              <FileCheck2 className="h-4 w-4 text-emerald-600" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-remax-blue-dark">{escriturasEsteMes}</p>
          <p className="mt-1 text-xs text-brand-muted">Negócios fechados desde o dia 1</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-brand-muted">Leads novos esta semana</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50">
              <UserPlus className="h-4 w-4 text-remax-blue" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-bold text-remax-blue-dark">{leadsNovosEstaSemana}</p>
          <p className="mt-1 text-xs text-brand-muted">Últimos 7 dias</p>
        </div>
      </div>

      <Link
        href="/leads?filtro=sem_contacto"
        className="mb-8 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm transition-colors hover:border-remax-blue/30 hover:bg-slate-50"
      >
        <span className="flex items-center gap-2 text-slate-600">
          <UserX className="h-4 w-4 text-remax-red" />
          Leads activos sem contacto há mais de 7 dias
        </span>
        <span className="flex items-center gap-1 font-medium text-remax-blue">
          Ver lista <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>

      {/* O que fazer hoje — tarefas + visitas juntas, atrasadas primeiro */}
      <div className="card mb-6">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-remax-blue-dark">O que fazer hoje</h2>
          <Link
            href="/tarefas"
            className="flex items-center gap-1 text-sm font-medium text-remax-blue hover:text-remax-red transition-colors"
          >
            Ver todas <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {tarefasUnificadas.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-brand-muted">
            Sem tarefas para hoje.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {tarefasUnificadas.map((tarefa) => (
              <li key={tarefa.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">{tarefa.titulo}</p>

                      {tarefa.atrasada && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                          Atrasada
                        </span>
                      )}

                      {!tarefa.atrasada && tarefa.prioridade && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            tarefa.prioridade === "Alta"
                              ? "bg-red-100 text-red-700"
                              : tarefa.prioridade === "Média"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {tarefa.prioridade}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-brand-muted">
                      {tarefa.leads?.nome
                        ? `${tarefa.leads.nome} ${tarefa.leads?.apelido ?? ""}`
                        : "Sem lead"}{" "}
                      · {tarefa.tipo ?? "Tarefa"} · {formatHora(tarefa.data_limite)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <form action={concluirTarefa}>
                      <input type="hidden" name="id" value={tarefa.id} />
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 transition-colors"
                      >
                        ✓ Concluir
                      </button>
                    </form>

                    <Link
                      href={`/leads/${tarefa.lead_id}`}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        tarefa.atrasada
                          ? "bg-remax-red-light text-remax-red"
                          : "bg-remax-blue-light text-remax-blue"
                      }`}
                    >
                      Abrir lead
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Visitas agendadas para os próximos dias (além de hoje) */}
      <div className="card mb-6">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="flex items-center gap-2 font-semibold text-remax-blue-dark">
            <Calendar className="h-4 w-4 text-remax-blue" /> Próximas Visitas
          </h2>
          <Link
            href="/pipeline"
            className="flex items-center gap-1 text-sm font-medium text-remax-blue hover:text-remax-red transition-colors"
          >
            Ver pipeline <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {proximasVisitas.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-brand-muted">
            Sem visitas agendadas.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {proximasVisitas.map((visita) => (
              <li key={visita.leadId} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium text-slate-800">{visita.nome || "Sem nome"}</p>
                  <p className="mt-1 text-xs text-brand-muted">{formatDataHora(visita.dataLimite)}</p>
                </div>
                <Link
                  href={`/leads/${visita.leadId}`}
                  className="rounded-lg bg-remax-blue-light px-3 py-1.5 text-xs font-semibold text-remax-blue"
                >
                  Abrir lead
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Leads recentes, com etiqueta do tipo de processo para bater o olho mais rápido */}
      <div className="card mb-6">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-remax-blue-dark">Leads Recentes</h2>
          <Link
            href="/leads"
            className="flex items-center gap-1 text-sm font-medium text-remax-blue hover:text-remax-red transition-colors"
          >
            Ver todos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <ul className="divide-y divide-slate-100">
          {recentLeads.length === 0 ? (
            <li className="px-6 py-8 text-center text-sm text-brand-muted">
              Sem leads registados.
            </li>
          ) : (
            recentLeads.map((lead) => {
              const etapaLabel = getEtapaLabel(lead.etapa);
              const estado =
                (lead as any).estado_final ?? (lead as any).estado_lead ?? "Activo";
              const tipoProcesso = (lead as any).tipo_processo ?? "Compra/Venda";
              const ehArrendamento = tipoProcesso === "Arrendamento";

              return (
                <li key={lead.id}>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          ehArrendamento ? "bg-amber-50" : "bg-blue-50"
                        }`}
                        title={tipoProcesso}
                      >
                        {ehArrendamento ? (
                          <Building2 className="h-4 w-4 text-amber-600" />
                        ) : (
                          <Home className="h-4 w-4 text-remax-blue" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{getLeadDisplayName(lead)}</p>
                        <p className="text-xs text-brand-muted">{lead.origem ?? "—"}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {estado}
                        </span>
                        <span className={ETAPA_BADGE[etapaLabel] ?? "badge-blue"}>{etapaLabel}</span>
                      </div>
                      <span className="text-xs text-brand-muted">
                        {formatRelativeTime(lead.created_at)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </div>

      <Link
        href="/relatorios"
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-4 text-sm font-medium text-brand-muted transition-colors hover:border-remax-blue/40 hover:text-remax-blue"
      >
        Ver relatórios completos (pipeline, leads perdidos, taxa de conversão) <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}