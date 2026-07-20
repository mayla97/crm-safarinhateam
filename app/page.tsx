import type { ComponentType } from "react";
import Link from "next/link";
import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  UserX,
  FileCheck2,
  UserPlus,
  Users,
  Calendar,
  AlertCircle,
} from "lucide-react";
import {
  fetchDashboardOperacional,
} from "@/lib/supabase/leads";
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

function StatItem({
  label,
  value,
  icon: Icon,
  accent = "text-remax-blue-dark",
}: {
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <div className="flex flex-1 items-center gap-3 px-6 py-5">
      <Icon className="h-5 w-5 text-slate-300" />
      <div>
        <p className={`text-2xl font-bold leading-none ${accent}`}>{value}</p>
        <p className="mt-1 text-xs text-brand-muted">{label}</p>
      </div>
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

  let escriturasConcluidas = 0;
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

    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    const [
      statsData,
      leadsStatusRes,
      leadsNovosRes,
      leadsVisitaRes,
      userRes,
    ] = await Promise.all([
      fetchDashboardOperacional(),
      supabase.from("leads").select("etapa, estado_final, estado_lead"),
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
    leadsNovosEstaSemana = leadsNovosRes.count ?? 0;

    const leadsStatus = leadsStatusRes.data ?? [];
    escriturasConcluidas = leadsStatus.filter((lead) => {
      const estado = lead.estado_final ?? lead.estado_lead;
      return estado === "Concluído" || lead.etapa === "escritura_realizada";
    }).length;

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
      .slice(0, 6);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "Erro ao carregar dados";
  }

  const tarefasUnificadas = [
    ...stats.tarefasAtrasadasLista.map((t) => ({ ...t, atrasada: true })),
    ...stats.tarefasHoje.map((t) => ({ ...t, atrasada: false })),
  ];

  const totalHoje = stats.tarefasHoje.length;
  const totalAtrasadas = stats.tarefasAtrasadasLista.length;
  const totalVisitas = proximasVisitas.length;

  return (
    <div>
      {loadError && (
        <div className="mb-6 rounded-lg border border-remax-red/30 bg-remax-red-light px-4 py-3 text-sm text-remax-red">
          {loadError}
        </div>
      )}

      {/* Cabeçalho — fala pela equipa, não como se as tarefas fossem só
          de quem está a olhar para o ecrã. Textura diagonal subtil como
          único "risco" visual da página. */}
      <div
        className="relative mb-6 overflow-hidden rounded-2xl bg-remax-blue-dark px-8 py-7 text-white"
        style={{
          backgroundImage:
            "repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 14px)",
        }}
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-remax-red/10" />
        <h1 className="relative text-2xl font-bold">
          {nomeUtilizador ? `Olá, ${nomeUtilizador}` : "Olá"}
        </h1>
        <p className="relative mt-1 text-white/70">
          A equipa tem{" "}
          {totalAtrasadas > 0 && (
            <span className="font-semibold text-red-300">
              {totalAtrasadas} tarefa{totalAtrasadas === 1 ? "" : "s"} atrasada{totalAtrasadas === 1 ? "" : "s"}
            </span>
          )}
          {totalAtrasadas > 0 && (totalHoje > 0 || totalVisitas > 0) && ", "}
          {totalHoje > 0 && `${totalHoje} tarefa${totalHoje === 1 ? "" : "s"} hoje`}
          {totalHoje > 0 && totalVisitas > 0 && " e "}
          {totalVisitas > 0 &&
            `${totalVisitas} visita${totalVisitas === 1 ? "" : "s"} agendada${totalVisitas === 1 ? "" : "s"}`}
          {totalAtrasadas === 0 && totalHoje === 0 && totalVisitas === 0 && "nada pendente por agora."}
        </p>
      </div>

      {/* Faixa única de números — em vez de vários cartões repetidos */}
      <div className="card mb-6 flex flex-col divide-y divide-slate-100 sm:flex-row sm:divide-x sm:divide-y-0">
        <StatItem label="Leads activos" value={stats.leadsAtivos} icon={Users} />
        <StatItem label="Escrituras concluídas (total)" value={escriturasConcluidas} icon={FileCheck2} accent="text-emerald-600" />
        <StatItem label="Leads novos esta semana" value={leadsNovosEstaSemana} icon={UserPlus} />
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

      {/* Tarefas e Visitas lado a lado — não empilhadas */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="flex items-center gap-2 font-semibold text-remax-blue-dark">
              <AlertCircle className="h-4 w-4 text-remax-red" /> Precisa de atenção
            </h2>
            <Link
              href="/tarefas"
              className="flex items-center gap-1 text-sm font-medium text-remax-blue hover:text-remax-red transition-colors"
            >
              Ver todas <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {tarefasUnificadas.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-brand-muted">
              Sem tarefas pendentes.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {tarefasUnificadas.map((tarefa) => (
                <li key={tarefa.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-slate-800">{tarefa.titulo}</p>
                        {tarefa.atrasada && (
                          <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                            Atrasada
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

                    <div className="flex shrink-0 gap-2">
                      <form action={concluirTarefa}>
                        <input type="hidden" name="id" value={tarefa.id} />
                        <button
                          type="submit"
                          className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 transition-colors"
                        >
                          ✓
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
                        Abrir
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="flex items-center gap-2 font-semibold text-remax-blue-dark">
              <Calendar className="h-4 w-4 text-remax-blue" /> Próximas Visitas
            </h2>
            <Link
              href="/pipeline"
              className="flex items-center gap-1 text-sm font-medium text-remax-blue hover:text-remax-red transition-colors"
            >
              Pipeline <ArrowRight className="h-4 w-4" />
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
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{visita.nome || "Sem nome"}</p>
                    <p className="mt-1 text-xs text-brand-muted">{formatDataHora(visita.dataLimite)}</p>
                  </div>
                  <Link
                    href={`/leads/${visita.leadId}`}
                    className="shrink-0 rounded-lg bg-remax-blue-light px-3 py-1.5 text-xs font-semibold text-remax-blue"
                  >
                    Abrir
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Link
        href="/relatorios"
        className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 py-4 text-sm font-medium text-brand-muted transition-colors hover:border-remax-blue/40 hover:text-remax-blue"
      >
        Ver relatórios completos (pipeline, leads perdidos, taxa de conversão) <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}