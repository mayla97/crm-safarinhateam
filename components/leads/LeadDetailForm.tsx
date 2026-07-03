"use client";
import { abrirEmailOutlook, abrirNoCalendarioOutlook } from "@/lib/outlook";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Save,
  Loader2,
  Plus,
  Check,
  FileText,
  PhoneCall,
  MessageSquare,
  Eye,
  UserCheck,
} from "lucide-react";
import { fetchLeadById } from "@/lib/supabase/leads";
import { fetchAgentes } from "@/lib/supabase/agentes";
import { fetchHistorico, addHistorico } from "@/lib/supabase/historico";
import type { HistoricoEntry } from "@/lib/supabase/historico";
import { useLeads } from "./LeadsProvider";
import { formatDate } from "@/lib/utils";
import {
  formatOrcamento,
  getEtapaLabel,
  ETAPA_BADGE,
  ETAPA_LABELS,
  ORIGENS,
  TIPOLOGIAS,
  TEMPERATURAS,
  getLeadDisplayName,
  getTemperaturaLabel,
} from "@/lib/leads";
import type { Agente, Lead, LeadEtapa, LeadTemperatura } from "@/types";
import { supabase } from "@/lib/supabase/client";

const inputClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-remax-blue focus:outline-none focus:ring-2 focus:ring-remax-blue/20";
const labelClass = "mb-1 block text-xs font-medium text-brand-muted";

const ESTADOS = ["Activo", "Perdido", "Pausado", "Concluído"];
const TIPO_PROCESSO = ["Compra/Venda", "Arrendamento"];

const ETAPAS_ARRENDAMENTO: Record<string, string> = {
  novo_lead: "Novo lead",
  em_tratamento: "Em tratamento",
  visita_agendada: "Visita agendada",
  visita_realizada: "Visita realizada",
  documentacao_recebida: "Documentação recebida",
  proposta_apresentada: "Proposta apresentada",
  contrato_assinado: "Contrato assinado",
};

const MOTIVOS_PERDA = [
  "Sem resposta",
  "Sem capacidade financeira",
  "Comprou com outro consultor",
  "Imóvel indisponível",
  "Perdeu interesse",
  "Lead antigo sem histórico",
  "Outro",
  "Não informado",
];

const TIPOS_TAREFA = [
  "Ligar",
  "WhatsApp",
  "Enviar imóveis",
  "Confirmar visita",
  "Follow-up",
  "Reunião",
  "Documentação",
];

const PRIORIDADES = ["Urgente", "Alta", "Normal", "Baixa"];

interface Tarefa {
  id: string;
  titulo: string;
  descricao?: string;
  tipo?: string;
  prioridade?: string;
  concluida: boolean;
  data_limite?: string;
  created_at: string;
}

interface LeadDetailFormProps {
  id: string;
}

function getHistoricoIcon(tipo: string) {
  switch (tipo) {
    case "tarefa":
      return <Check className="h-4 w-4 text-emerald-500" />;
    case "chamada":
      return <PhoneCall className="h-4 w-4 text-remax-blue" />;
    case "whatsapp":
      return <MessageSquare className="h-4 w-4 text-green-500" />;
    case "visita":
      return <Eye className="h-4 w-4 text-amber-500" />;
    case "estado":
      return <UserCheck className="h-4 w-4 text-remax-red" />;
    case "etapa":
      return <UserCheck className="h-4 w-4 text-remax-blue" />;
    default:
      return <FileText className="h-4 w-4 text-slate-400" />;
  }
}

export function LeadDetailForm({ id }: LeadDetailFormProps) {
  const router = useRouter();
  const { updateLead } = useLeads();

  const [lead, setLead] = useState<Lead | null>(null);
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [historico, setHistorico] = useState<HistoricoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [nota, setNota] = useState("");
  const [addingNota, setAddingNota] = useState(false);

  const [showPerdidoModal, setShowPerdidoModal] = useState(false);
  const [motivoPerda, setMotivoPerda] = useState("Não informado");
  const [notaPerda, setNotaPerda] = useState("");

  const [showTarefaModal, setShowTarefaModal] = useState(false);
  const [novaTarefa, setNovaTarefa] = useState({
    titulo: "",
    tipo: "Follow-up",
    prioridade: "Normal",
    data_limite: "",
    descricao: "",
  });

  const [form, setForm] = useState({
    nome: "",
    apelido: "",
    telemovel: "",
    email: "",
    tipologia: "",
    zona_interesse: "",
    origem: "",
    agente_id: "",
    temperatura: "" as LeadTemperatura | "",
    orcamento_maximo: "",
    observacoes: "",
    etapa: "novo_lead" as LeadEtapa,
    etapa_arrendamento: "novo_lead",
    tipo_processo: "Compra/Venda",
    estado_lead: "Activo",
    tipo_proxima_acao: "",
    data_proxima_acao: "",
  });

  const handleDelete = async () => {
    if (!confirm("Tens a certeza que queres apagar este lead? Esta acção não pode ser desfeita.")) return;
    await supabase.from("lead_historico").delete().eq("lead_id", id);
    await supabase.from("tarefas").delete().eq("lead_id", id);
    await supabase.from("leads").delete().eq("id", id);
    router.push("/leads");
  };

  const reloadHistorico = async () => {
    const h = await fetchHistorico(id);
    setHistorico(h);
  };

  useEffect(() => {
    setLoading(true);

    Promise.all([fetchLeadById(id), fetchAgentes(), fetchHistorico(id)])
      .then(([leadData, agentesData, historicoData]) => {
        if (!leadData) {
          setError("Lead não encontrado");
          return;
        }

        setLead(leadData);
        setAgentes(agentesData);
        setHistorico(historicoData);

        setForm({
          nome: leadData.nome,
          apelido: leadData.apelido ?? "",
          telemovel: leadData.telemovel ?? "",
          email: leadData.email ?? "",
          tipologia: leadData.tipologia ?? "",
          zona_interesse: leadData.zona_interesse ?? "",
          origem: leadData.origem ?? "",
          agente_id: leadData.agente_id ?? "",
          temperatura: leadData.temperatura ?? "",
          orcamento_maximo:
            leadData.orcamento_maximo != null
              ? String(leadData.orcamento_maximo)
              : "",
          observacoes: leadData.observacoes ?? "",
          etapa: leadData.etapa,
          etapa_arrendamento:
            (leadData as any).etapa_arrendamento ?? "novo_lead",
          tipo_processo:
            (leadData as any).tipo_processo ?? "Compra/Venda",
          estado_lead:
            (leadData as any).estado_final ??
            (leadData as any).estado_lead ??
            "Activo",
          tipo_proxima_acao:
            (leadData as any).tipo_proxima_acao ?? "",
          data_proxima_acao:
            (leadData as any).data_proxima_acao ?? "",
        });
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Erro ao carregar lead")
      )
      .finally(() => setLoading(false));

    supabase
      .from("tarefas")
      .select("*")
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .then(({ data }: { data: any }) => {
        if (data) setTarefas(data);
      });
  }, [id]);

  const handleSave = async () => {
    if (!lead) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    const etapaAnterior = lead.etapa;
    const etapaArrendamentoAnterior =
      (lead as any).etapa_arrendamento ?? "novo_lead";
    const tipoAnterior =
      (lead as any).tipo_processo ?? "Compra/Venda";

    try {
      const alteracoes: string[] = [];

      if ((lead.origem ?? "") !== (form.origem ?? "")) {
        alteracoes.push(
          `Origem alterada: ${lead.origem ?? "—"} → ${form.origem || "—"}`
        );
      }

      if ((lead.temperatura ?? "") !== (form.temperatura ?? "")) {
        alteracoes.push(
          `Temperatura alterada: ${lead.temperatura ?? "—"} → ${
            form.temperatura || "—"
          }`
        );
      }

      if ((lead.zona_interesse ?? "") !== (form.zona_interesse ?? "")) {
        alteracoes.push(
          `Zona alterada: ${lead.zona_interesse ?? "—"} → ${
            form.zona_interesse || "—"
          }`
        );
      }

      const orcamento = form.orcamento_maximo
        ? parseFloat(
            form.orcamento_maximo.replace(/\s/g, "").replace(",", ".")
          )
        : null;

      const updated = await updateLead(id, {
        nome: form.nome.trim(),
        apelido: form.apelido.trim() || null,
        telemovel: form.telemovel.trim() || null,
        email: form.email.trim() || null,
        tipologia: form.tipologia || null,
        zona_interesse: form.zona_interesse.trim() || null,
        origem: form.origem || null,
        agente_id: form.agente_id || null,
        temperatura: form.temperatura || null,
        orcamento_maximo:
          orcamento && !isNaN(orcamento) ? orcamento : null,
        observacoes: form.observacoes.trim() || null,
        etapa:
          form.tipo_processo === "Compra/Venda"
            ? form.etapa
            : "novo_lead",
      });

      await supabase
        .from("leads")
        .update({
          tipo_processo: form.tipo_processo,
          etapa_arrendamento:
            form.tipo_processo === "Arrendamento"
              ? form.etapa_arrendamento
              : null,
          estado_lead: form.estado_lead,
          estado_final: form.estado_lead,
          tipo_proxima_acao: form.tipo_proxima_acao || null,
          data_proxima_acao: form.data_proxima_acao || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (tipoAnterior !== form.tipo_processo) {
        await addHistorico(
          id,
          "estado",
          `Tipo de processo alterado: ${tipoAnterior} → ${form.tipo_processo}`
        );
      }

      if (
        form.tipo_processo === "Compra/Venda" &&
        etapaAnterior !== form.etapa
      ) {
        await addHistorico(
          id,
          "etapa",
          `Etapa alterada: ${getEtapaLabel(etapaAnterior)} → ${getEtapaLabel(
            form.etapa
          )}`
        );
      }

      if (
        form.tipo_processo === "Arrendamento" &&
        etapaArrendamentoAnterior !== form.etapa_arrendamento
      ) {
        await addHistorico(
          id,
          "etapa",
          `Etapa de arrendamento alterada: ${
            ETAPAS_ARRENDAMENTO[etapaArrendamentoAnterior] ??
            etapaArrendamentoAnterior
          } → ${
            ETAPAS_ARRENDAMENTO[form.etapa_arrendamento] ??
            form.etapa_arrendamento
          }`
        );
      }

      if (
        form.tipo_processo === "Compra/Venda" &&
        form.etapa === "escritura_realizada"
      ) {
        await supabase
          .from("leads")
          .update({
            estado_final: "Concluído",
            estado_lead: "Concluído",
          })
          .eq("id", id);

        await addHistorico(
          id,
          "estado",
          "Lead marcado automaticamente como Concluído após escritura realizada"
        );

        setForm((prev) => ({
          ...prev,
          estado_lead: "Concluído",
        }));
      }

      if (
        form.tipo_processo === "Arrendamento" &&
        form.etapa_arrendamento === "contrato_assinado"
      ) {
        await supabase
          .from("leads")
          .update({
            estado_final: "Concluído",
            estado_lead: "Concluído",
          })
          .eq("id", id);

        await addHistorico(
          id,
          "estado",
          "Lead marcado automaticamente como Concluído após contrato assinado"
        );

        setForm((prev) => ({
          ...prev,
          estado_lead: "Concluído",
        }));
      }

      if (form.tipo_proxima_acao && form.data_proxima_acao) {
        await supabase.from("tarefas").insert({
          lead_id: id,
          titulo: form.tipo_proxima_acao,
          tipo: "Follow-up",
          prioridade: "Normal",
          data_limite: form.data_proxima_acao,
          concluida: false,
        });

        await addHistorico(
          id,
          "followup",
          `Próxima acção agendada: ${
            form.tipo_proxima_acao
          } para ${new Date(form.data_proxima_acao).toLocaleString("pt-PT")}`
        );
      }

      const refreshed = await fetchLeadById(id);
      if (refreshed) setLead(refreshed);
      else setLead(updated);

      for (const alteracao of alteracoes) {
        await addHistorico(id, "estado", alteracao);
      }

      await reloadHistorico();
      setEditing(false);
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleEstadoChange = async (novoEstado: string) => {
    if (novoEstado === "Perdido") {
      setShowPerdidoModal(true);
      return;
    }

    await supabase
      .from("leads")
      .update({
        estado_final: novoEstado,
        estado_lead: novoEstado,
      })
      .eq("id", id);

    await addHistorico(
      id,
      "estado",
      `Estado do lead alterado para: ${novoEstado}`
    );

    setForm((prev) => ({ ...prev, estado_lead: novoEstado }));
    await reloadHistorico();
  };

  const confirmarPerdido = async () => {
    await supabase
      .from("leads")
      .update({
        estado_final: "Perdido",
        motivo_perda: motivoPerda,
        estado_lead: "Perdido",
      })
      .eq("id", id);

    await addHistorico(
      id,
      "estado",
      `Lead marcado como Perdido. Motivo: ${motivoPerda}${
        notaPerda ? `. Nota: ${notaPerda}` : ""
      }`
    );

    setForm((prev) => ({ ...prev, estado_lead: "Perdido" }));
    setNotaPerda("");
    setShowPerdidoModal(false);
    await reloadHistorico();
  };

  const criarTarefa = async () => {
    if (!novaTarefa.titulo.trim()) return;

    const { data } = await supabase
      .from("tarefas")
      .insert({
        lead_id: id,
        titulo: novaTarefa.titulo,
        tipo: novaTarefa.tipo,
        prioridade: novaTarefa.prioridade,
        data_limite: novaTarefa.data_limite || null,
        descricao: novaTarefa.descricao || null,
        concluida: false,
      })
      .select()
      .single();

    if (data) setTarefas([data, ...tarefas]);

    await addHistorico(id, "tarefa", `Nova tarefa criada: ${novaTarefa.titulo}`);
    await reloadHistorico();

    setNovaTarefa({
      titulo: "",
      tipo: "Follow-up",
      prioridade: "Normal",
      data_limite: "",
      descricao: "",
    });
    setShowTarefaModal(false);
  };

  const concluirTarefa = async (tarefaId: string) => {
    await supabase
      .from("tarefas")
      .update({ concluida: true })
      .eq("id", tarefaId);

    const titulo = tarefas.find((t) => t.id === tarefaId)?.titulo ?? "";

    setTarefas(
      tarefas.map((t) =>
        t.id === tarefaId ? { ...t, concluida: true } : t
      )
    );

    await addHistorico(id, "tarefa", `Tarefa concluída: ${titulo}`);
    await reloadHistorico();
  };

  const adicionarNota = async () => {
    if (!nota.trim()) return;

    setAddingNota(true);
    await addHistorico(id, "nota", nota.trim());
    setNota("");
    await reloadHistorico();
    setAddingNota(false);
  };

  const getTarefaStatus = (tarefa: Tarefa) => {
    if (tarefa.concluida) return "concluida";
    if (!tarefa.data_limite) return "pendente";

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const limite = new Date(tarefa.data_limite);
    limite.setHours(0, 0, 0, 0);

    if (limite < hoje) return "atrasada";
    if (limite.getTime() === hoje.getTime()) return "hoje";

    return "pendente";
  };

  const tarefasPendentes = tarefas.filter((t) => !t.concluida);
  const tarefasConcluidas = tarefas.filter((t) => t.concluida);

  if (loading) {
    return (
      <div className="card flex items-center justify-center gap-2 p-12 text-brand-muted">
        <Loader2 className="h-5 w-5 animate-spin" /> A carregar lead...
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="card p-12 text-center">
        <p className="text-lg font-semibold text-remax-blue-dark">
          {error ?? "Lead não encontrado"}
        </p>
        <Link href="/leads" className="btn-primary mt-6 inline-flex">
          <ArrowLeft className="h-4 w-4" />
          Voltar aos Leads
        </Link>
      </div>
    );
  }

  const tipoProcessoAtual =
    (lead as any).tipo_processo ?? form.tipo_processo ?? "Compra/Venda";

  const etapaLabel =
    tipoProcessoAtual === "Arrendamento"
      ? ETAPAS_ARRENDAMENTO[(lead as any).etapa_arrendamento ?? "novo_lead"] ??
        "Novo lead"
      : getEtapaLabel(lead.etapa);

  return (
    <div>
      {showPerdidoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-remax-blue-dark">
              Marcar como Perdido
            </h3>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Motivo da perda *</label>
                <select
                  className={inputClass}
                  value={motivoPerda}
                  onChange={(e) => setMotivoPerda(e.target.value)}
                >
                  {MOTIVOS_PERDA.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClass}>Nota opcional</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={3}
                  value={notaPerda}
                  onChange={(e) => setNotaPerda(e.target.value)}
                  placeholder="Adiciona uma nota..."
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowPerdidoModal(false)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button onClick={confirmarPerdido} className="btn-primary flex-1">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showTarefaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-remax-blue-dark">
              Nova Tarefa
            </h3>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>Título *</label>
                <input
                  className={inputClass}
                  value={novaTarefa.titulo}
                  onChange={(e) =>
                    setNovaTarefa({ ...novaTarefa, titulo: e.target.value })
                  }
                  placeholder="Ex: Ligar para confirmar visita"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Tipo</label>
                  <select
                    className={inputClass}
                    value={novaTarefa.tipo}
                    onChange={(e) =>
                      setNovaTarefa({ ...novaTarefa, tipo: e.target.value })
                    }
                  >
                    {TIPOS_TAREFA.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Prioridade</label>
                  <select
                    className={inputClass}
                    value={novaTarefa.prioridade}
                    onChange={(e) =>
                      setNovaTarefa({
                        ...novaTarefa,
                        prioridade: e.target.value,
                      })
                    }
                  >
                    {PRIORIDADES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Data limite</label>
                <input
                  type="datetime-local"
                  className={inputClass}
                  value={novaTarefa.data_limite}
                  onChange={(e) =>
                    setNovaTarefa({
                      ...novaTarefa,
                      data_limite: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className={labelClass}>Descrição</label>
                <textarea
                  className={`${inputClass} resize-none`}
                  rows={2}
                  value={novaTarefa.descricao}
                  onChange={(e) =>
                    setNovaTarefa({
                      ...novaTarefa,
                      descricao: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowTarefaModal(false)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button onClick={criarTarefa} className="btn-primary flex-1">
                Criar Tarefa
              </button>
            </div>
          </div>
        </div>
      )}

      <Link
        href="/leads"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-remax-blue transition-colors hover:text-remax-red"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos Leads
      </Link>

      {error && (
        <div className="mb-4 rounded-lg bg-remax-red-light px-4 py-3 text-sm text-remax-red">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Alterações guardadas com sucesso.
        </div>
      )}

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-remax-blue-dark">
              {getLeadDisplayName(lead)}
            </h1>

            <span className={ETAPA_BADGE[etapaLabel] ?? "badge-blue"}>
              {etapaLabel}
            </span>

            <span
              className={`rounded-full px-2 py-1 text-xs font-medium ${
                form.estado_lead === "Perdido"
                  ? "bg-red-100 text-red-700"
                  : form.estado_lead === "Pausado"
                  ? "bg-yellow-100 text-yellow-700"
                  : form.estado_lead === "Concluído"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {form.estado_lead}
            </span>
          </div>

          <p className="mt-1 text-sm text-brand-muted">
            Lead criado em {formatDate(lead.created_at)}
          </p>
        </div>

        <div className="flex gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Apagar lead
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn-primary"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Guardar
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              >
                Apagar lead
              </button>

              <button
                type="button"
                onClick={() => setEditing(true)}
                className="btn-secondary"
              >
                Editar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <h2 className="mb-4 font-semibold text-remax-blue-dark">
              {editing ? "Editar lead" : "Dados do lead"}
            </h2>

            {editing ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Nome *</label>
                  <input
                    className={inputClass}
                    value={form.nome}
                    onChange={(e) =>
                      setForm({ ...form, nome: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Apelido</label>
                  <input
                    className={inputClass}
                    value={form.apelido}
                    onChange={(e) =>
                      setForm({ ...form, apelido: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Telemóvel</label>
                  <input
                    className={inputClass}
                    value={form.telemovel}
                    onChange={(e) =>
                      setForm({ ...form, telemovel: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    className={inputClass}
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Tipo de processo</label>
                  <select
                    className={inputClass}
                    value={form.tipo_processo}
                    onChange={(e) => {
                      const novoTipo = e.target.value;
                      setForm({
                        ...form,
                        tipo_processo: novoTipo,
                        etapa:
                          novoTipo === "Compra/Venda"
                            ? "novo_lead"
                            : form.etapa,
                        etapa_arrendamento:
                          novoTipo === "Arrendamento"
                            ? "novo_lead"
                            : form.etapa_arrendamento,
                      });
                    }}
                  >
                    {TIPO_PROCESSO.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Etapa</label>
                  {form.tipo_processo === "Arrendamento" ? (
                    <select
                      className={inputClass}
                      value={form.etapa_arrendamento}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          etapa_arrendamento: e.target.value,
                        })
                      }
                    >
                      {Object.entries(ETAPAS_ARRENDAMENTO).map(
                        ([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  ) : (
                    <select
                      className={inputClass}
                      value={form.etapa}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          etapa: e.target.value as LeadEtapa,
                        })
                      }
                    >
                      {(Object.keys(ETAPA_LABELS) as LeadEtapa[])
                        .filter((e) => e !== "cpcv_enviado")
                        .map((e) => (
                          <option key={e} value={e}>
                            {ETAPA_LABELS[e]}
                          </option>
                        ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Tipologia</label>
                  <select
                    className={inputClass}
                    value={form.tipologia}
                    onChange={(e) =>
                      setForm({ ...form, tipologia: e.target.value })
                    }
                  >
                    {TIPOLOGIAS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Zona de interesse</label>
                  <input
                    className={inputClass}
                    value={form.zona_interesse}
                    onChange={(e) =>
                      setForm({ ...form, zona_interesse: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className={labelClass}>Origem</label>
                  <select
                    className={inputClass}
                    value={form.origem}
                    onChange={(e) =>
                      setForm({ ...form, origem: e.target.value })
                    }
                  >
                    {ORIGENS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Agente</label>
                  <select
                    className={inputClass}
                    value={form.agente_id}
                    onChange={(e) =>
                      setForm({ ...form, agente_id: e.target.value })
                    }
                  >
                    <option value="">—</option>
                    {agentes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Temperatura</label>
                  <select
                    className={inputClass}
                    value={form.temperatura}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        temperatura: e.target.value as LeadTemperatura | "",
                      })
                    }
                  >
                    <option value="">—</option>
                    {TEMPERATURAS.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Estado</label>
                  <select
                    className={inputClass}
                    value={form.estado_lead}
                    onChange={(e) => handleEstadoChange(e.target.value)}
                  >
                    {ESTADOS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>
                    {form.tipo_processo === "Arrendamento"
                      ? "Renda máxima"
                      : "Orçamento máximo"}
                  </label>
                  <input
                    type="number"
                    className={inputClass}
                    value={form.orcamento_maximo}
                    onChange={(e) =>
                      setForm({ ...form, orcamento_maximo: e.target.value })
                    }
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelClass}>Observações</label>
                  <textarea
                    className={`${inputClass} resize-none`}
                    rows={3}
                    value={form.observacoes}
                    onChange={(e) =>
                      setForm({ ...form, observacoes: e.target.value })
                    }
                  />
                </div>
              </div>
            ) : (
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 text-remax-blue" />
                  <div>
                    <dt className="text-xs font-medium text-brand-muted">Email</dt>
                    <dd className="text-sm text-slate-800">{lead.email ?? "—"}</dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 text-remax-blue" />
                  <div>
                    <dt className="text-xs font-medium text-brand-muted">Telemóvel</dt>
                    <dd className="text-sm text-slate-800">{lead.telemovel ?? "—"}</dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-remax-blue" />
                  <div>
                    <dt className="text-xs font-medium text-brand-muted">Tipo de processo</dt>
                    <dd className="text-sm text-slate-800">{tipoProcessoAtual}</dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-remax-blue" />
                  <div>
                    <dt className="text-xs font-medium text-brand-muted">Tipologia</dt>
                    <dd className="text-sm text-slate-800">{lead.tipologia ?? "—"}</dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-remax-blue" />
                  <div>
                    <dt className="text-xs font-medium text-brand-muted">Zona</dt>
                    <dd className="text-sm text-slate-800">{lead.zona_interesse ?? "—"}</dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-remax-blue" />
                  <div>
                    <dt className="text-xs font-medium text-brand-muted">Origem</dt>
                    <dd className="text-sm text-slate-800">{lead.origem ?? "—"}</dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-remax-blue" />
                  <div>
                    <dt className="text-xs font-medium text-brand-muted">Agente</dt>
                    <dd className="text-sm text-slate-800">{lead.agente_nome ?? "—"}</dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-remax-blue" />
                  <div>
                    <dt className="text-xs font-medium text-brand-muted">Temperatura</dt>
                    <dd className="text-sm text-slate-800">{getTemperaturaLabel(lead.temperatura)}</dd>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-remax-blue" />
                  <div>
                    <dt className="text-xs font-medium text-brand-muted">Última atualização</dt>
                    <dd className="text-sm text-slate-800">{formatDate(lead.updated_at)}</dd>
                  </div>
                </div>

                {lead.observacoes && (
                  <div className="border-t border-slate-100 pt-4 sm:col-span-2">
                    <dt className="text-xs font-medium text-brand-muted">Observações</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                      {lead.observacoes}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          <div className="card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold text-remax-blue-dark">
                <Check className="h-4 w-4 text-remax-blue" /> Tarefas (
                {tarefasPendentes.length} pendentes)
              </h2>
              <button
                onClick={() => setShowTarefaModal(true)}
                className="btn-primary text-sm"
              >
                <Plus className="h-3 w-3" /> Nova Tarefa
              </button>
            </div>

            {tarefasPendentes.length === 0 && tarefasConcluidas.length === 0 && (
              <p className="py-4 text-center text-sm text-brand-muted">
                Sem tarefas. Cria a primeira!
              </p>
            )}

            <div className="space-y-2">
              {tarefasPendentes.map((tarefa) => {
                const status = getTarefaStatus(tarefa);

                return (
                  <div
                    key={tarefa.id}
                    className={`flex items-center gap-3 rounded-lg border p-3 ${
                      status === "atrasada"
                        ? "border-red-200 bg-red-50"
                        : status === "hoje"
                        ? "border-yellow-200 bg-yellow-50"
                        : "border-slate-100 bg-slate-50"
                    }`}
                  >
                    <button
                      onClick={() => concluirTarefa(tarefa.id)}
                      className="h-5 w-5 flex-shrink-0 rounded-full border-2 border-slate-300 transition-colors hover:border-emerald-500"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800">
                        {tarefa.titulo}
                      </p>
                      <p className="text-xs text-brand-muted">
                        {tarefa.tipo}{" "}
                        {tarefa.data_limite
                          ? `· ${new Date(tarefa.data_limite).toLocaleDateString("pt-PT")}`
                          : ""}
                      </p>
                    </div>

                    
<button
  onClick={() =>
    abrirNoCalendarioOutlook({
      titulo: tarefa.titulo,
      descricao: tarefa.descricao ?? undefined,
      inicio: tarefa.data_limite
        ? new Date(tarefa.data_limite)
        : new Date(),
      duracaoMinutos: 30,
    })
  }
  title="Adicionar à agenda do Outlook"
  className="text-xs text-remax-blue hover:underline whitespace-nowrap"
>
  📅 Agenda
</button>

                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        status === "atrasada"
                          ? "bg-red-100 text-red-700"
                          : status === "hoje"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {status === "atrasada"
                        ? "Atrasada"
                        : status === "hoje"
                        ? "Hoje"
                        : "Pendente"}
                    </span>
                  </div>
                );
              })}

              {tarefasConcluidas.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="mb-2 text-xs font-medium text-brand-muted">
                    Concluídas
                  </p>
                  {tarefasConcluidas.map((tarefa) => (
                    <div
                      key={tarefa.id}
                      className="flex items-center gap-3 rounded-lg p-3 opacity-50"
                    >
                      <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                      <p className="text-sm text-slate-500 line-through">
                        {tarefa.titulo}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-remax-blue-dark">
              <FileText className="h-4 w-4 text-remax-blue" /> Timeline
            </h2>

            <div className="mb-6 flex gap-2">
              <textarea
                className={`${inputClass} flex-1 resize-none`}
                rows={2}
                placeholder="Adicionar nota, chamada, observação..."
                value={nota}
                onChange={(e) => setNota(e.target.value)}
              />
              <button
                onClick={adicionarNota}
                disabled={addingNota || !nota.trim()}
                className="btn-primary self-end"
              >
                {addingNota ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </button>
            </div>

            {historico.length === 0 && (
              <p className="py-4 text-center text-sm text-brand-muted">
                Sem histórico ainda.
              </p>
            )}

            <div className="space-y-4">
              {historico.map((entry, index) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                      {getHistoricoIcon(entry.tipo)}
                    </div>
                    {index < historico.length - 1 && (
                      <div className="mt-1 w-px flex-1 bg-slate-200" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm text-slate-700">{entry.descricao}</p>
                    <p className="mt-1 text-xs text-brand-muted">
                      {formatDate(entry.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="mb-4 font-semibold text-remax-blue-dark">
              {tipoProcessoAtual === "Arrendamento" ? "Renda máxima" : "Orçamento máximo"}
            </h2>
            <p className="text-3xl font-bold text-remax-red">
              {formatOrcamento(lead.orcamento_maximo)}
            </p>
          </div>

          <div className="card p-6">
            <h2 className="mb-4 font-semibold text-remax-blue-dark">Ações rápidas</h2>

            <div className="space-y-2">
              {lead.telemovel && (
                <a
                  href={`tel:${lead.telemovel.replace(/\s/g, "")}`}
                  className="btn-secondary w-full justify-center"
                >
                  <Phone className="h-4 w-4" /> Ligar
                </a>
              )}

              {lead.email && (
                <button
                onClick={() => lead.email && abrirEmailOutlook(lead.email)}
                  className="btn-secondary w-full justify-center"
                >
                  <Mail className="h-4 w-4" /> Enviar email
                </button>
              )}

              <Link href="/pipeline" className="btn-primary w-full justify-center">
                Ver no Pipeline
              </Link>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="mb-4 font-semibold text-remax-blue-dark">Estado do lead</h2>

            <div className="space-y-2">
              {ESTADOS.map((estado) => (
                <button
                  key={estado}
                  onClick={() => handleEstadoChange(estado)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                    form.estado_lead === estado
                      ? estado === "Perdido"
                        ? "bg-red-100 text-red-700"
                        : estado === "Pausado"
                        ? "bg-yellow-100 text-yellow-700"
                        : estado === "Concluído"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-emerald-100 text-emerald-700"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {form.estado_lead === estado ? "✓ " : ""}
                  {estado}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}