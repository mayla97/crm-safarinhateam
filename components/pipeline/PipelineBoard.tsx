"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Loader2, Flame, Snowflake, Thermometer, MapPin, Home, Clock, PauseCircle,
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

export function PipelineBoard() {
  const { leads, loading, error, updateLeadEtapa, refreshLeads } = useLeads();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"compra" | "arrendamento">("compra");


  const activeLeads = leads.filter((lead: any) => {
    const estado = lead.estado_final ?? lead.estado_lead ?? "Activo";
    return estado !== "Perdido" && estado !== "Concluído";
  });

  console.log("LEADS ACTIVOS:", activeLeads.map((l: any) => ({ id: l.id, nome: l.nome, tipo_processo: l.tipo_processo })));

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

  const getTemperatureStyle = (temp?: string | null) => {
    switch (temp) {
      case "quente": return { icon: Flame, className: "bg-red-50 text-red-600 border-red-100" };
      case "morno": return { icon: Thermometer, className: "bg-amber-50 text-amber-600 border-amber-100" };
      default: return { icon: Snowflake, className: "bg-blue-50 text-blue-600 border-blue-100" };
    }
  };

  const renderCard = (lead: any, onDrop?: (etapa: any, id: string) => void) => {
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
        </div>
      </li>
    );
  };

  const renderStages = (stages: any[], stageLeads: any[], getEtapa: (l: any) => string, onDrop: (etapa: any, id: string) => void) => (
    <div className="flex min-w-max gap-5">
      {stages.map((stage) => {
        const stageLds = stageLeads
        .filter((l) => getEtapa(l) === stage.id)
        .sort((a, b) => new Date(b.updated_at ?? 0).getTime() - new Date(a.updated_at ?? 0).getTime());
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
              {stageLds.map((lead) => renderCard(lead, onDrop))}
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
        <div className="overflow-x-auto pb-4">
          {activeTab === "compra"
            ? renderStages(pipelineStages, compraLeads, (l) => l.etapa, handleDropCompra)
            : renderStages(ARRENDAMENTO_STAGES, arrendamentoLeads, (l) => l.etapa_arrendamento ?? "novo_lead", handleDropArrendamento)
          }
        </div>
      )}
    </div>
  );
}