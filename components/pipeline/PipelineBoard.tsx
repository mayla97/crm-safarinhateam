"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2, Flame, Snowflake, Thermometer, MapPin, Home, Clock, PauseCircle, Check, X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useLeads } from "@/components/leads/LeadsProvider";
import { PIPELINE_STAGES, getLeadDisplayName, formatRelativeTime } from "@/lib/leads";
import { supabase } from "@/lib/supabase/client";
import { addHistorico } from "@/lib/supabase/historico";
import { ETAPA_LABELS } from "@/lib/leads";
import type { LeadEtapa } from "@/types";

const ARRENDAMENTO_STAGES = [
  { id: "novo_lead", title: "Novo lead", color: "bg-slate-400" },
  { id: "em_tratamento", title: "Em tratamento", color: "bg-remax-blue" },
  { id: "visita_agendada", title: "Visita agendada", color: "bg-amber-400" },
  { id: "visita_realizada", title: "Visita realizada", color: "bg-amber-500" },
  { id: "documentacao_recebida", title: "Documentação recebida", color: "bg-orange-400" },
  { id: "proposta_apresentada", title: "Proposta apresentada", color: "bg-emerald-400" },
  { id: "contrato_assinado", title: "Contrato assinado", color: "bg-emerald-600" },
];

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

function getEntradaTs(lead: any): number | null {
  return parseDataFlexivel(lead.data_entrada) ?? parseDataFlexivel(lead.created_at);
}

interface PendingVisita {
  leadId: string;
  tipoProcesso: "compra" | "arrendamento";
}

export function PipelineBoard() {
  const { leads, loading, error, updateLeadEtapa, refreshLeads } = useLeads();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"compra" | "arrendamento">("compra");

  // ─── Agendar visita (modal a pedir data/hora ao mover para "Visita agendada") ──
  const [pendingVisita, setPendingVisita] = useState<PendingVisita | null>(null);
  const [visitaData, setVisitaData] = useState("");
  const [visitaNota, setVisitaNota] = useState("");
  const [guardandoVisita, setGuardandoVisita] = useState(false);

  // ─── Scroll horizontal por arrasto ──────────────────────────────────────
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollRef = useRef(0);
  const [isPanning, setIsPanning] = useState(false);

  const handlePanMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[draggable="true"]') || target.closest("a") || target.closest("button")) return;

    isPanningRef.current = true;
    setIsPanning(true);
    startXRef.current = e.pageX;
    startScrollRef.current = scrollContainerRef.current?.scrollLeft ?? 0;
  };

  const handlePanMouseMove = (e: React.MouseEvent) => {
    if (!isPanningRef.current || !scrollContainerRef.current) return;
    e.preventDefault();
    const dx = e.pageX - startXRef.current;
    scrollContainerRef.current.scrollLeft = startScrollRef.current - dx;
  };

  const stopPanning = () => {
    isPanningRef.current = false;
    setIsPanning(false);
  };

  const activeLeads = leads.filter((lead: any) => {
    const estado = lead.estado_final ?? lead.estado_lead ?? "Activo";
    return estado !== "Perdido" && estado !== "Concluído";
  });

  const arrendamentoLeads = activeLeads.filter((l: any) => {
    const tipo = String(l.tipo_processo ?? "").trim().toLowerCase();
    return tipo === "arrendamento";
  });

  const compraLeads = activeLeads.filter((l: any) => {
    const tipo = String(l.tipo_processo ?? "").trim().toLowerCase();
    return tipo !== "arrendamento";
  });

  const pipelineStages = PIPELINE_STAGES.filter((stage) => stage.id !== "cpcv_enviado");

  const handleDropCompra = async (etapa: LeadEtapa, leadId: string) => {
    if (!leadId) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.etapa === etapa) return;

    if (etapa === "visita_agendada") {
      setPendingVisita({ leadId, tipoProcesso: "compra" });
      setDraggingId(null);
      return;
    }

    setUpdatingId(leadId);
    try {
      await updateLeadEtapa(leadId, etapa);
      await addHistorico(leadId, "etapa", `Etapa alterada: ${ETAPA_LABELS[lead.etapa]} → ${ETAPA_LABELS[etapa]}`);
    }
    catch { await refreshLeads(); }
    finally { setUpdatingId(null); setDraggingId(null); }
  };

  const ETAPAS_ARR: Record<string, string> = {
    novo_lead: "Novo lead", em_tratamento: "Em tratamento",
    visita_agendada: "Visita agendada", visita_realizada: "Visita realizada",
    documentacao_recebida: "Documentação recebida",
    proposta_apresentada: "Proposta apresentada", contrato_assinado: "Contrato assinado",
  };

  const handleDropArrendamento = async (etapa: string, leadId: string) => {
    if (!leadId) return;
    const lead = leads.find((l) => l.id === leadId);
    const etapaAnterior = (lead as any)?.etapa_arrendamento ?? "novo_lead";
    if (etapaAnterior === etapa) return;

    if (etapa === "visita_agendada") {
      setPendingVisita({ leadId, tipoProcesso: "arrendamento" });
      setDraggingId(null);
      return;
    }

    setUpdatingId(leadId);
    try {
      await supabase.from("leads").update({ etapa_arrendamento: etapa, updated_at: new Date().toISOString() }).eq("id", leadId);
      await addHistorico(leadId, "etapa", `Etapa de arrendamento alterada: ${ETAPAS_ARR[etapaAnterior] ?? etapaAnterior} → ${ETAPAS_ARR[etapa] ?? etapa}`);
      if (etapa === "contrato_assinado") {
        await supabase.from("leads").update({ estado_final: "Concluído", estado_lead: "Concluído" }).eq("id", leadId);
        await addHistorico(leadId, "estado", "Lead marcado automaticamente como Concluído após contrato assinado");
      }
      await refreshLeads();
    } catch { await refreshLeads(); }
    finally { setUpdatingId(null); setDraggingId(null); }
  };

  const cancelarModalVisita = () => {
    setPendingVisita(null);
    setVisitaData("");
    setVisitaNota("");
  };

  const confirmarAgendamentoVisita = async () => {
    if (!pendingVisita) return;
    const { leadId, tipoProcesso } = pendingVisita;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;

    setGuardandoVisita(true);
    try {
      if (tipoProcesso === "compra") {
        await updateLeadEtapa(leadId, "visita_agendada");
        await addHistorico(leadId, "etapa", `Etapa alterada: ${ETAPA_LABELS[lead.etapa]} → ${ETAPA_LABELS["visita_agendada"]}`);
      } else {
        const etapaAnterior = (lead as any)?.etapa_arrendamento ?? "novo_lead";
        await supabase.from("leads").update({ etapa_arrendamento: "visita_agendada", updated_at: new Date().toISOString() }).eq("id", leadId);
        await addHistorico(leadId, "etapa", `Etapa de arrendamento alterada: ${ETAPAS_ARR[etapaAnterior] ?? etapaAnterior} → ${ETAPAS_ARR["visita_agendada"]}`);
      }

      await supabase.from("tarefas").insert({
        lead_id: leadId,
        titulo: "Visita agendada",
        tipo: "Confirmar visita",
        prioridade: "Alta",
        data_limite: visitaData || null,
        descricao: visitaNota || null,
        concluida: false,
      });

      if (visitaData) {
        await addHistorico(
          leadId,
          "followup",
          `Visita agendada para ${new Date(visitaData).toLocaleString("pt-PT")}${visitaNota ? `. Nota: ${visitaNota}` : ""}`
        );
      }

      await refreshLeads();
      cancelarModalVisita();
    } catch {
      await refreshLeads();
    } finally {
      setGuardandoVisita(false);
    }
  };

  const marcarVisitaComoConcluida = async (leadId: string) => {
    await supabase
      .from("tarefas")
      .update({ concluida: true })
      .eq("lead_id", leadId)
      .eq("tipo", "Confirmar visita")
      .eq("concluida", false);
  };

  const handleVisitaRealizada = async (lead: any) => {
    setUpdatingId(lead.id);
    try {
      const tipo = String(lead.tipo_processo ?? "").trim().toLowerCase();
      if (tipo === "arrendamento") {
        await supabase.from("leads").update({ etapa_arrendamento: "visita_realizada", updated_at: new Date().toISOString() }).eq("id", lead.id);
        await addHistorico(lead.id, "etapa", `Etapa de arrendamento alterada: ${ETAPAS_ARR["visita_agendada"]} → ${ETAPAS_ARR["visita_realizada"]}`);
      } else {
        await updateLeadEtapa(lead.id, "visita_realizada");
        await addHistorico(lead.id, "etapa", `Etapa alterada: ${ETAPA_LABELS["visita_agendada"]} → ${ETAPA_LABELS["visita_realizada"]}`);
      }
      await marcarVisitaComoConcluida(lead.id);
      await refreshLeads();
    } catch {
      await refreshLeads();
    } finally {
      setUpdatingId(null);
    }
  };

  const handleVisitaCancelada = async (lead: any) => {
    setUpdatingId(lead.id);
    try {
      const tipo = String(lead.tipo_processo ?? "").trim().toLowerCase();
      if (tipo === "arrendamento") {
        await supabase.from("leads").update({ etapa_arrendamento: "em_tratamento", updated_at: new Date().toISOString() }).eq("id", lead.id);
        await addHistorico(lead.id, "etapa", `Visita cancelada / cliente não compareceu. Etapa de arrendamento voltou de "${ETAPAS_ARR["visita_agendada"]}" para "${ETAPAS_ARR["em_tratamento"]}"`);
      } else {
        await updateLeadEtapa(lead.id, "em_tratamento");
        await addHistorico(lead.id, "etapa", `Visita cancelada / cliente não compareceu. Etapa voltou de "${ETAPA_LABELS["visita_agendada"]}" para "${ETAPA_LABELS["em_tratamento"]}"`);
      }
      await marcarVisitaComoConcluida(lead.id);
      await refreshLeads();
    } catch {
      await refreshLeads();
    } finally {
      setUpdatingId(null);
    }
  };

  const getTemperatureStyle = (temp?: string | null) => {
    switch (temp) {
      case "quente": return { icon: Flame, className: "bg-red-50 text-red-600 border-red-100" };
      case "morno": return { icon: Thermometer, className: "bg-amber-50 text-amber-600 border-amber-100" };
      default: return { icon: Snowflake, className: "bg-blue-50 text-blue-600 border-blue-100" };
    }
  };

  const renderCard = (lead: any, isVisitaAgendada: boolean) => {
    const estado = lead.estado_final ?? lead.estado_lead ?? "Activo";
    const pausado = estado === "Pausado";
    const tempStyle = getTemperatureStyle(lead.temperatura);
    const TempIcon = tempStyle.icon;

    return (
      <li key={lead.id}>
        <div
          draggable
          onDragStart={(e) => { setDraggingId(lead.id); e.dataTransfer.setData("leadId", lead.id); e.dataTransfer.effectAllowed = "move"; }}
          onDragEnd={() => setDraggingId(null)}
          className={`group cursor-grab rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg active:cursor-grabbing ${pausado ? "border-slate-300 bg-slate-100/80" : "border-slate-200 bg-white"} ${updatingId === lead.id ? "opacity-50" : ""} ${draggingId === lead.id ? "ring-2 ring-remax-blue/30" : ""}`}
        >
          <Link href={`/leads/${lead.id}`} draggable={false} className="block">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h4 className="line-clamp-2 text-base font-semibold text-slate-800">{getLeadDisplayName(lead)}</h4>
                <p className="mt-1 text-sm text-slate-500">{lead.telemovel ?? "—"}</p>
                {pausado && (
                  <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                    <PauseCircle className="h-3 w-3" /> Pausado
                  </div>
                )}
              </div>
              <div className={`flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium ${tempStyle.className}`}>
                <TempIcon className="h-3 w-3" />
                <span>{lead.temperatura ?? "frio"}</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600"><MapPin className="h-4 w-4 text-slate-400" /><span>{lead.zona_interesse ?? "Sem zona"}</span></div>
              <div className="flex items-center gap-2 text-slate-600"><Home className="h-4 w-4 text-slate-400" /><span>{lead.tipologia ?? "Sem tipologia"}</span></div>
              <div className="flex items-center gap-2 text-slate-500"><Clock className="h-4 w-4 text-slate-400" /><span>Atualizado {formatRelativeTime(lead.updated_at)}</span></div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="rounded-full bg-remax-blue-light px-2.5 py-1 text-xs font-medium text-remax-blue">{lead.origem ?? "Sem origem"}</span>
            </div>
          </Link>

          {isVisitaAgendada && (
            <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVisitaRealizada(lead); }}
                disabled={updatingId === lead.id}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-100 px-2 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200 transition-colors"
              >
                <Check className="h-3 w-3" /> Realizada
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleVisitaCancelada(lead); }}
                disabled={updatingId === lead.id}
                className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="h-3 w-3" /> Cancelar
              </button>
            </div>
          )}
        </div>
      </li>
    );
  };

  const renderStages = (stages: any[], stageLeads: any[], getEtapa: (l: any) => string, onDrop: (etapa: any, id: string) => void) => (
    <div className="flex min-w-max gap-5">
      {stages.map((stage) => {
        const stageLds = stageLeads
          .filter((l) => getEtapa(l) === stage.id)
          .sort((a, b) => (getEntradaTs(b) ?? 0) - (getEntradaTs(a) ?? 0)); // mais recentes primeiro
        const isEmpty = stageLds.length === 0;
        return (
          <div
            key={stage.id}
            className={`flex w-[320px] shrink-0 flex-col rounded-2xl border border-slate-200 bg-slate-50/60 ${isEmpty ? "min-h-[230px]" : "min-h-[680px]"}`}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
            onDrop={(e) => { e.preventDefault(); const leadId = e.dataTransfer.getData("leadId") || draggingId || ""; onDrop(stage.id, leadId); }}
          >
            <div className="sticky top-0 z-10 rounded-t-2xl border-b border-slate-200 bg-white px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-remax-blue-dark">{stage.title}</h3>
                  <p className="mt-1 text-xs text-slate-500">{stageLds.length} lead{stageLds.length === 1 ? "" : "s"}</p>
                </div>
                <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${stage.color}`}>
                  {stageLds.length}
                </div>
              </div>
            </div>
            <ul className={`flex flex-col gap-4 p-4 ${isEmpty ? "h-[150px]" : "min-h-[600px] flex-1"}`}>
              {stageLds.map((lead) => renderCard(lead, stage.id === "visita_agendada"))}
              {isEmpty && (
                <li className="flex h-full items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-400">
                  Arraste leads para aqui
                </li>
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      {pendingVisita && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-remax-blue-dark">
              Agendar Visita
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-brand-muted">Data e hora da visita</label>
                <input
                  type="datetime-local"
                  value={visitaData}
                  onChange={(e) => setVisitaData(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-remax-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-brand-muted">Nota (opcional)</label>
                <textarea
                  rows={3}
                  value={visitaNota}
                  onChange={(e) => setVisitaNota(e.target.value)}
                  placeholder="Morada, quem vai acompanhar, etc."
                  className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-remax-blue focus:outline-none"
                />
              </div>
            </div>

            <p className="mt-3 text-xs text-brand-muted">
              Isto cria uma tarefa "Confirmar visita" com esta data, visível em Tarefas, Calendário e no Dashboard.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={cancelarModalVisita}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarAgendamentoVisita}
                disabled={guardandoVisita}
                className="btn-primary flex-1"
              >
                {guardandoVisita ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PageHeader title="Pipeline" description="Arraste os leads entre etapas" />

      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("compra")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "compra" ? "border-remax-blue text-remax-blue" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Compra / Venda ({compraLeads.length})
        </button>
        <button
          onClick={() => setActiveTab("arrendamento")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "arrendamento" ? "border-remax-blue text-remax-blue" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Arrendamento ({arrendamentoLeads.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-brand-muted">
          <Loader2 className="h-5 w-5 animate-spin" /> A carregar pipeline...
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          className={`overflow-x-auto pb-4 select-none ${isPanning ? "cursor-grabbing" : "cursor-grab"}`}
          onMouseDown={handlePanMouseDown}
          onMouseMove={handlePanMouseMove}
          onMouseUp={stopPanning}
          onMouseLeave={stopPanning}
        >
          {activeTab === "compra"
            ? renderStages(pipelineStages, compraLeads, (l) => l.etapa, handleDropCompra)
            : renderStages(ARRENDAMENTO_STAGES, arrendamentoLeads, (l) => l.etapa_arrendamento ?? "novo_lead", handleDropArrendamento)
          }
        </div>
      )}
    </div>
  );
}