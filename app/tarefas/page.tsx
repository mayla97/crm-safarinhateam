import Link from "next/link";
import { unstable_noStore as noStore, revalidatePath } from "next/cache";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Tarefa = {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: string | null;
  tipo: string | null;
  data_limite: string | null;
  concluida: boolean;
  lead_id: string | null;
  leads?: {
    nome?: string | null;
    apelido?: string | null;
    estado_final?: string | null;
    estado_lead?: string | null;
  } | null;
};

function formatData(data?: string | null) {
  if (!data) return "Sem data";

  return new Date(data).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getLeadNome(tarefa: Tarefa) {
  const lead = Array.isArray(tarefa.leads) ? tarefa.leads[0] : tarefa.leads;
  if (!lead?.nome) return "Sem lead";
  return `${lead.nome} ${lead.apelido ?? ""}`.trim();
}

function priorityClass(prioridade?: string | null) {
  if (prioridade === "Alta") return "bg-red-100 text-red-700";
  if (prioridade === "Média") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

async function concluirTarefa(formData: FormData) {
  "use server";

  const id = String(formData.get("id"));
  const supabase = await createClient();

  await supabase.from("tarefas").update({ concluida: true }).eq("id", id);

  revalidatePath("/tarefas");
  revalidatePath("/");
}

function TarefaItem({
  tarefa,
  concluida = false,
  danger = false,
}: {
  tarefa: Tarefa;
  concluida?: boolean;
  danger?: boolean;
}) {
  return (
    <li className={`flex items-start gap-4 px-5 py-4 hover:bg-slate-50/70 ${concluida ? "opacity-60" : ""}`}>
      {concluida ? (
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
      ) : danger ? (
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-remax-red" />
      ) : (
        <Circle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`font-medium ${concluida ? "line-through text-slate-500" : "text-slate-800"}`}>
            {tarefa.titulo}
          </p>

          {tarefa.prioridade && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${priorityClass(tarefa.prioridade)}`}>
              {tarefa.prioridade}
            </span>
          )}
        </div>

        <p className="mt-1 flex items-center gap-1 text-xs text-brand-muted">
          <Clock className="h-3 w-3" />
          {formatData(tarefa.data_limite)}
        </p>

        <p className="mt-1 text-xs text-brand-muted">
          {getLeadNome(tarefa)} · {tarefa.tipo ?? "Tarefa"}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        {!concluida && (
          <form action={concluirTarefa}>
            <input type="hidden" name="id" value={tarefa.id} />
            <button
              type="submit"
              className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200"
            >
              ✓ Concluir
            </button>
          </form>
        )}

        {tarefa.lead_id && (
          <Link
            href={`/leads/${tarefa.lead_id}`}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              danger
                ? "bg-remax-red-light text-remax-red hover:bg-red-100"
                : "bg-remax-blue-light text-remax-blue hover:bg-blue-100"
            }`}
          >
            Abrir lead <ArrowRight className="ml-1 inline h-3 w-3" />
          </Link>
        )}
      </div>
    </li>
  );
}

function TaskSection({
  title,
  items,
  empty,
  danger = false,
  icon,
}: {
  title: string;
  items: Tarefa[];
  empty: string;
  danger?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        {icon}
        <h2 className="font-semibold text-remax-blue-dark">
          {title} ({items.length})
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-brand-muted">
          {empty}
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((tarefa) => (
            <TarefaItem key={tarefa.id} tarefa={tarefa} danger={danger} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function TarefasPage() {
  noStore();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tarefas")
    .select("id, titulo, descricao, prioridade, tipo, data_limite, concluida, lead_id, leads(nome, apelido, estado_final, estado_lead)")
    .order("data_limite", { ascending: true });

  const tarefas = ((data ?? []) as Tarefa[]).filter((tarefa) => {
    const lead = Array.isArray(tarefa.leads) ? tarefa.leads[0] : tarefa.leads;
    const estado = lead?.estado_final ?? lead?.estado_lead ?? "Activo";
    return estado !== "Perdido" && estado !== "Arquivado";
  });

  const agora = new Date();

  const hojeInicio = new Date();
  hojeInicio.setHours(0, 0, 0, 0);

  const hojeFim = new Date();
  hojeFim.setHours(23, 59, 59, 999);

  const pendentes = tarefas.filter((t) => !t.concluida);
  const concluidas = tarefas.filter((t) => t.concluida).slice(0, 8);

  const atrasadas = pendentes.filter((t) => t.data_limite && new Date(t.data_limite) < agora);
  const hoje = pendentes.filter((t) => {
    if (!t.data_limite) return false;
    const data = new Date(t.data_limite);
    return data >= hojeInicio && data <= hojeFim;
  });
  const proximas = pendentes.filter((t) => {
    if (!t.data_limite) return true;
    return new Date(t.data_limite) > hojeFim;
  });

  return (
    <div>
      <PageHeader
        title="Tarefas"
        description="Organize e acompanhe as atividades da equipa"
      />

      {error && (
        <div className="mb-4 rounded-lg border border-remax-red/30 bg-remax-red-light px-4 py-3 text-sm text-remax-red">
          {error.message}
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="card p-5">
          <p className="text-sm text-brand-muted">Atrasadas</p>
          <p className="mt-1 text-3xl font-bold text-remax-red">{atrasadas.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-brand-muted">Hoje</p>
          <p className="mt-1 text-3xl font-bold text-remax-blue-dark">{hoje.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-brand-muted">Próximas</p>
          <p className="mt-1 text-3xl font-bold text-remax-blue-dark">{proximas.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-brand-muted">Concluídas</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{concluidas.length}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <TaskSection
            title="Atrasadas"
            items={atrasadas}
            empty="Sem tarefas atrasadas."
            danger
            icon={<AlertTriangle className="h-5 w-5 text-remax-red" />}
          />

          <TaskSection
            title="Hoje"
            items={hoje}
            empty="Sem tarefas para hoje."
            icon={<Clock className="h-5 w-5 text-remax-blue" />}
          />

          <TaskSection
            title="Próximas"
            items={proximas}
            empty="Sem próximas tarefas."
            icon={<CalendarDays className="h-5 w-5 text-remax-blue" />}
          />
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <h2 className="font-semibold text-remax-blue-dark">
              Concluídas recentes ({concluidas.length})
            </h2>
          </div>

          {concluidas.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-brand-muted">
              Sem tarefas concluídas.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {concluidas.map((tarefa) => (
                <TarefaItem key={tarefa.id} tarefa={tarefa} concluida />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}