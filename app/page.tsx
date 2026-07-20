import Link from "next/link";
import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  Users,
  ArrowRight,
  Clock,
  UserX,
  FileCheck2,
  CircleX,
  Calendar,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatsCard } from "@/components/ui/StatsCard";
import {
  fetchDashboardOperacional,
  fetchRecentLeads,
} from "@/lib/supabase/leads";
import {
  getEtapaLabel,
  ETAPA_BADGE,
  getLeadDisplayName,
  formatRelativeTime,
  PIPELINE_STAGES,
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

function formatDataHora(data?: string) {
  if (!data) return "Sem data";
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

function TaskList({
  title,
  items,
  empty,
  danger = false,
}: {
  title: string;
  items: TarefaResumo[];
  empty: string;
  danger?: boolean;
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 className="font-semibold text-remax-blue-dark">{title}</h2>
        <Link
          href="/tarefas"
          className="flex items-center gap-1 text-sm font-medium text-remax-blue hover:text-remax-red transition-colors"
        >
          Ver todas <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="px-6 py-8 text-center text-sm text-brand-muted">
          {empty}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((tarefa) => (
            <li key={tarefa.id} className="px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800">
                      {tarefa.titulo}
                    </p>

                    {tarefa.prioridade && (
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
                    · {tarefa.tipo ?? "Tarefa"} ·{" "}
                    {formatHora(tarefa.data_limite)}
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
                      danger
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
  );
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
  let escriturasConcluidas = 0;
  let leadsPerdidos = 0;
  let proximasVisitas: Array<{
    leadId: string;
    nome: string;
    dataLimite: string | null;
  }> = [];
  let loadError: string | null = null;

  try {
    const supabase = await createClient();

    const [statsData, recentData, leadsStatusRes, leadsVisitaRes] = await Promise.all([
      fetchDashboardOperacional(),
      fetchRecentLeads(4),
      supabase
        .from("leads")
        .select("etapa, estado_final, estado_lead"),
      // Fonte da verdade: leads que ESTÃO ACTUALMENTE na etapa "Visita
      // agendada" (Compra/Venda ou Arrendamento), não a tabela de tarefas —
      // assim mostra sempre quem está genuinamente agendado, mesmo que
      // tenha entrado nessa etapa antes de existir a tarefa automática.
      supabase
        .from("leads")
        .select("id, nome, apelido, etapa, etapa_arrendamento, estado_final, estado_lead")
        .or("etapa.eq.visita_agendada,etapa_arrendamento.eq.visita_agendada"),
    ]);

    stats = statsData;
    recentLeads = recentData;

    const leadsEmVisita = (leadsVisitaRes.data ?? []).filter((lead: any) => {
      const estado = lead.estado_final ?? lead.estado_lead ?? "Activo";
      return estado !== "Perdido" && estado !== "Concluído";
    });

    let datasPorLead = new Map<string, string | null>();
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

    const leadsStatus = leadsStatusRes.data ?? [];

    escriturasConcluidas = leadsStatus.filter((lead) => {
      const estado = lead.estado_final ?? lead.estado_lead;
      return estado === "Concluído" || lead.etapa === "escritura_realizada";
    }).length;

    leadsPerdidos = leadsStatus.filter((lead) => {
      const estado = lead.estado_final ?? lead.estado_lead;
      return estado === "Perdido";
    }).length;
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Erro ao carregar dados";
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Resumo operacional da equipa Sa Farinha"
      />

      {loadError && (
        <div className="mb-6 rounded-lg border border-remax-red/30 bg-remax-red-light px-4 py-3 text-sm text-remax-red">
          {loadError}
        </div>
      )}

      <div className="mb-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard
          title="Leads ativos"
          value={stats.leadsAtivos}
          change="Em acompanhamento comercial"
          changeType="neutral"
          icon={Users}
          iconColor="blue"
        />

        <StatsCard
          title="Escrituras concluídas"
          value={escriturasConcluidas}
          change="Negócios fechados com sucesso"
          changeType="positive"
          icon={FileCheck2}
          iconColor="green"
        />

        {/* "Leads sem contacto" deixou de mostrar o número em destaque —
            com a importação inicial, quase toda a base entra nesta
            contagem, o que tornava o card sempre "gigante" e deixava
            de funcionar como alerta. Agora é só um atalho para a lista,
            para retomar aos poucos sem o número a assustar. */}
        <Link
          href="/leads?filtro=sem_contacto"
          className="card flex flex-col justify-between p-5 transition-shadow hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-brand-muted">Leads sem contacto</p>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50">
              <UserX className="h-4 w-4 text-red-500" />
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1 text-sm font-semibold text-remax-blue">
            Ver leads para retomar <ArrowRight className="h-3.5 w-3.5" />
          </p>
        </Link>

        <StatsCard
          title="Leads perdidos"
          value={leadsPerdidos}
          change="Oportunidades encerradas"
          changeType="negative"
          icon={CircleX}
          iconColor="red"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <TaskList
          title="Tarefas de Hoje"
          items={stats.tarefasHoje}
          empty="Sem tarefas para hoje."
        />
        <TaskList
          title="Tarefas Atrasadas"
          items={stats.tarefasAtrasadasLista}
          empty="Sem tarefas atrasadas."
          danger
        />
      </div>

      <div className="mt-6 card">
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
                  <p className="font-medium text-slate-800">
                    {visita.nome || "Sem nome"}
                  </p>
                  <p className="mt-1 text-xs text-brand-muted">
                    {visita.dataLimite ? formatDataHora(visita.dataLimite) : "Sem data agendada"}
                  </p>
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

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="font-semibold text-remax-blue-dark">
              Leads Recentes
            </h2>
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
                  (lead as any).estado_final ??
                  (lead as any).estado_lead ??
                  "Activo";

                return (
                  <li key={lead.id}>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/80 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-slate-800">
                          {getLeadDisplayName(lead)}
                        </p>
                        <p className="text-xs text-brand-muted">
                          {lead.origem ?? "—"}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {estado}
                          </span>
                          <span className={ETAPA_BADGE[etapaLabel] ?? "badge-blue"}>
                            {etapaLabel}
                          </span>
                        </div>

                        <span className="flex items-center gap-1 text-xs text-brand-muted">
                          <Clock className="h-3 w-3" />
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

        <div className="card p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-semibold text-remax-blue-dark">
              Pipeline — Resumo
            </h2>
            <Link
              href="/pipeline"
              className="flex items-center gap-1 text-sm font-medium text-remax-blue hover:text-remax-red transition-colors"
            >
              Ver pipeline <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {PIPELINE_STAGES.map((stage) => {
              const valor = stats.pipelinePorEtapa[stage.id] ?? 0;
              const max = Math.max(...Object.values(stats.pipelinePorEtapa), 1);
              const largura = (valor / max) * 100;

              return (
                <div key={stage.id}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      {stage.title}
                    </span>
                    <span className="text-sm font-bold text-remax-blue-dark">
                      {valor}
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${stage.color}`}
                      style={{ width: `${largura}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}