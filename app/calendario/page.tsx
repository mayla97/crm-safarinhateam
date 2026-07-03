"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { PageHeader } from "@/components/ui/PageHeader";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import Link from "next/link";

interface Tarefa {
  id: string;
  titulo: string;
  tipo?: string;
  prioridade?: string;
  concluida: boolean;
  data_limite?: string;
  lead_id: string;
  leads?: { nome?: string; apelido?: string } | null;
}

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];

export default function CalendarioPage() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(hoje.getDate());
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    setLoading(true);
    supabase
      .from("tarefas")
      .select("*, leads(nome, apelido)")
      .eq("concluida", false)
      .not("data_limite", "is", null)
      .then(({ data }) => {
        setTarefas(data ?? []);
        setLoading(false);
      });
  }, []);

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const tarefasPorDia = (dia: number) => {
    return tarefas.filter((t) => {
      if (!t.data_limite) return false;
      const d = new Date(t.data_limite);
      return d.getFullYear() === ano && d.getMonth() === mes && d.getDate() === dia;
    });
  };

  const tarefasDiaSelecionado = diaSelecionado ? tarefasPorDia(diaSelecionado) : [];

  const mesAnterior = () => {
    if (mes === 0) { setMes(11); setAno(ano - 1); }
    else setMes(mes - 1);
    setDiaSelecionado(null);
  };

  const proximoMes = () => {
    if (mes === 11) { setMes(0); setAno(ano + 1); }
    else setMes(mes + 1);
    setDiaSelecionado(null);
  };

  const concluirTarefa = async (id: string) => {
    await supabase.from("tarefas").update({ concluida: true }).eq("id", id);
    setTarefas(tarefas.filter((t) => t.id !== id));
  };

  const cells = [];
  for (let i = 0; i < primeiroDia; i++) cells.push(null);
  for (let i = 1; i <= diasNoMes; i++) cells.push(i);

  return (
    <div>
      <PageHeader title="Calendário" description="Tarefas organizadas por data" />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <button onClick={mesAnterior} className="rounded-lg p-2 hover:bg-slate-100">
                <ChevronLeft className="h-5 w-5 text-slate-600" />
              </button>
              <h2 className="font-semibold text-remax-blue-dark">
                {MESES[mes]} {ano}
              </h2>
              <button onClick={proximoMes} className="rounded-lg p-2 hover:bg-slate-100">
                <ChevronRight className="h-5 w-5 text-slate-600" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {DIAS_SEMANA.map((d) => (
                <div key={d} className="py-2 text-center text-xs font-medium text-brand-muted">
                  {d}
                </div>
              ))}

              {cells.map((dia, i) => {
                if (!dia) return <div key={`empty-${i}`} />;
                const t = tarefasPorDia(dia);
                const isHoje = dia === hoje.getDate() && mes === hoje.getMonth() && ano === hoje.getFullYear();
                const isSelecionado = dia === diaSelecionado;

                return (
                  <button
                    key={dia}
                    onClick={() => setDiaSelecionado(dia)}
                    className={`relative flex flex-col items-center rounded-lg p-2 text-sm transition-colors ${
                      isSelecionado ? "bg-remax-blue text-white" :
                      isHoje ? "bg-remax-blue-light text-remax-blue font-semibold" :
                      "hover:bg-slate-100 text-slate-700"
                    }`}
                  >
                    {dia}
                    {t.length > 0 && (
                      <span className={`mt-1 h-1.5 w-1.5 rounded-full ${isSelecionado ? "bg-white" : "bg-remax-red"}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 font-semibold text-remax-blue-dark">
            {diaSelecionado
              ? `${diaSelecionado} de ${MESES[mes]}`
              : "Selecciona um dia"}
          </h2>

          {loading ? (
            <p className="text-sm text-brand-muted">A carregar...</p>
          ) : tarefasDiaSelecionado.length === 0 ? (
            <p className="text-sm text-brand-muted">
              {diaSelecionado ? "Sem tarefas neste dia." : "Clica num dia para ver as tarefas."}
            </p>
          ) : (
            <div className="space-y-3">
              {tarefasDiaSelecionado.map((t) => (
                <div key={t.id} className="rounded-lg border border-slate-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{t.titulo}</p>
                      <p className="text-xs text-brand-muted">
                        {t.leads?.nome ? `${t.leads.nome} ${t.leads.apelido ?? ""}` : "Sem lead"}
                        {t.tipo ? ` · ${t.tipo}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => concluirTarefa(t.id)}
                      className="rounded-full border-2 border-slate-300 p-0.5 hover:border-emerald-500 hover:bg-emerald-50"
                    >
                      <Check className="h-3 w-3 text-emerald-500" />
                    </button>
                  </div>
                  <Link
                    href={`/leads/${t.lead_id}`}
                    className="mt-2 block text-xs text-remax-blue hover:underline"
                  >
                    Ver lead →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}