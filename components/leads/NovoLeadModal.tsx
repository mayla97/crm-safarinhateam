"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { ORIGENS, TIPOLOGIAS, TEMPERATURAS } from "@/lib/leads";
import { fetchAgentes } from "@/lib/supabase/agentes";

import type { Agente, LeadTemperatura } from "@/types";
import { useLeads } from "./LeadsProvider";

interface NovoLeadModalProps {
  open: boolean;
  onClose: () => void;
}

interface FormState {
  nome: string;
  apelido: string;
  telemovel: string;
  email: string;
  tipologia: string;
  zona_interesse: string;
  origem: string;
  agente_id: string;
  temperatura: LeadTemperatura | "";
  orcamento_maximo: string;
  observacoes: string;
  tipo_processo: string;
}

interface Duplicado {
  id: string;
  nome: string;
  apelido: string | null;
  telemovel: string | null;
  email: string | null;
  campo: string;
}

const initialForm: FormState = {
  nome: "",
  apelido: "",
  telemovel: "",
  email: "",
  tipologia: "T2",
  zona_interesse: "",
  origem: "Site Remax",
  agente_id: "",
  temperatura: "",
  orcamento_maximo: "",
  observacoes: "",
  tipo_processo: "Compra/Venda",
};

const inputClass = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-remax-blue focus:outline-none focus:ring-2 focus:ring-remax-blue/20";
const labelClass = "mb-1 block text-sm font-medium text-slate-700";

export function NovoLeadModal({ open, onClose }: NovoLeadModalProps) {
  const router = useRouter();
  const { addLead, leads } = useLeads();
  const [form, setForm] = useState<FormState>(initialForm);
  const [agentes, setAgentes] = useState<Agente[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [duplicados, setDuplicados] = useState<Duplicado[]>([]);
  const [verificando, setVerificando] = useState(false);
  const [ignorarDuplicados, setIgnorarDuplicados] = useState(false);

  
  useEffect(() => {
    if (!open) return;
    fetchAgentes().then(setAgentes).catch(() => setAgentes([]));
  }, [open]);

  const handleClose = () => {
    setForm(initialForm);
    setError(null);
    setDuplicados([]);
    setIgnorarDuplicados(false);
    onClose();
  };

  const verificarDuplicados = (telemovel: string, email: string) => {
    const telefoneLimpo = telemovel.replace(/\s/g, "").trim();
    const emailLimpo = email.trim().toLowerCase();
  
    const encontrados = leads
      .filter((lead: any) => {
        const telefoneExistente = (lead.telemovel ?? "")
          .replace(/\s/g, "")
          .trim();
  
        const emailExistente = (lead.email ?? "")
          .trim()
          .toLowerCase();
  
        return (
          (telefoneLimpo && telefoneExistente === telefoneLimpo) ||
          (emailLimpo && emailExistente === emailLimpo)
        );
      })
      .map((lead: any) => ({
        id: lead.id,
        nome: lead.nome,
        apelido: lead.apelido ?? null,
        telemovel: lead.telemovel ?? null,
        email: lead.email ?? null,
        campo:
          telefoneLimpo &&
          (lead.telemovel ?? "").replace(/\s/g, "").trim() === telefoneLimpo
            ? "telemóvel"
            : "email",
      }));
  
    setDuplicados(encontrados);
    if (encontrados.length > 0) setIgnorarDuplicados(false);
  
    return encontrados;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { setError("O nome é obrigatório."); return; }

    // Verificar duplicados antes de submeter
    const encontrados = verificarDuplicados(form.telemovel, form.email);

if (encontrados.length > 0 && !ignorarDuplicados) {
  setError("Existem leads duplicados. Confirma se queres criar mesmo assim.");
  return;
}

    setSubmitting(true);
    setError(null);
    try {
      const orcamento = form.orcamento_maximo
        ? parseFloat(form.orcamento_maximo.replace(/\s/g, "").replace(",", ".")) : null;
      const id = await addLead({
        nome: form.nome.trim(),
        apelido: form.apelido.trim() || null,
        telemovel: form.telemovel.trim() || null,
        email: form.email.trim() || null,
        tipologia: form.tipologia || null,
        zona_interesse: form.zona_interesse.trim() || null,
        origem: form.origem || null,
        agente_id: form.agente_id || null,
        temperatura: form.temperatura || null,
        orcamento_maximo: orcamento && !isNaN(orcamento) ? orcamento : null,
        observacoes: form.observacoes.trim() || null,
        tipo_processo: form.tipo_processo,
      } as any);
      handleClose();
      router.push(`/leads/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar lead");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Novo Lead" className="max-w-2xl max-h-[90vh] flex flex-col">
      <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
        <div className="overflow-y-auto px-6 py-5">
          {error && (
            <p className="mb-4 rounded-lg bg-remax-red-light px-3 py-2 text-sm text-remax-red">{error}</p>
          )}

          {/* Aviso de duplicados */}
          {duplicados.length > 0 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800 mb-2">
                ⚠️ Possível duplicado encontrado
              </p>
              {duplicados.map(d => (
  <div key={d.id} className="flex items-center justify-between mb-2">
    <div>
      <p className="text-sm text-amber-700">
        <strong>{d.nome} {d.apelido ?? ""}</strong> — mesmo {d.campo}
      </p>
      <p className="text-xs text-amber-600">
        {d.telemovel ?? ""} {d.email ?? ""}
      </p>
    </div>

    <a
      href={`/leads/${d.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-remax-blue underline ml-2 whitespace-nowrap"
    >
      Ver lead
    </a>
  </div>
))}
              <label className="mt-3 flex items-center gap-2 text-sm text-amber-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ignorarDuplicados}
                  onChange={e => setIgnorarDuplicados(e.target.checked)}
                  className="rounded"
                />
                Criar mesmo assim (lead diferente)
              </label>
            </div>
          )}

          <div className="space-y-4">
            {/* Tipo de processo */}
            <div>
              <label className={labelClass}>Tipo de processo</label>
              <div className="flex gap-3">
                {["Compra/Venda", "Arrendamento"].map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setForm({ ...form, tipo_processo: tipo })}
                    className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${form.tipo_processo === tipo ? "border-remax-blue bg-remax-blue text-white" : "border-slate-200 bg-white text-slate-600 hover:border-remax-blue hover:text-remax-blue"}`}
                  >
                    {tipo}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="nome" className={labelClass}>Nome *</label>
                <input id="nome" type="text" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label htmlFor="apelido" className={labelClass}>Apelido</label>
                <input id="apelido" type="text" value={form.apelido} onChange={(e) => setForm({ ...form, apelido: e.target.value })} className={inputClass} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="telemovel" className={labelClass}>Telemóvel</label>
                <input
                  id="telemovel"
                  type="tel"
                  value={form.telemovel}
                  onChange={(e) => setForm({ ...form, telemovel: e.target.value })}
                
                  className={`${inputClass} ${duplicados.some(d => d.campo === "telemóvel") ? "border-amber-400" : ""}`}
                />
                {verificando && <p className="mt-1 text-xs text-brand-muted">A verificar duplicados...</p>}
              </div>
              <div>
                <label htmlFor="email" className={labelClass}>Email</label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  
                  className={`${inputClass} ${duplicados.some(d => d.campo === "email") ? "border-amber-400" : ""}`}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="tipologia" className={labelClass}>Tipologia</label>
                <select id="tipologia" value={form.tipologia} onChange={(e) => setForm({ ...form, tipologia: e.target.value })} className={inputClass}>
                  {TIPOLOGIAS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="zona" className={labelClass}>Zona de interesse</label>
                <input id="zona" type="text" value={form.zona_interesse} onChange={(e) => setForm({ ...form, zona_interesse: e.target.value })} className={inputClass} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="origem" className={labelClass}>Origem</label>
                <select id="origem" value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} className={inputClass}>
                  {ORIGENS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="agente" className={labelClass}>Agente</label>
                <select id="agente" value={form.agente_id} onChange={(e) => setForm({ ...form, agente_id: e.target.value })} className={inputClass}>
                  <option value="">— Selecionar —</option>
                  {agentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="temperatura" className={labelClass}>Temperatura</label>
                <select id="temperatura" value={form.temperatura} onChange={(e) => setForm({ ...form, temperatura: e.target.value as LeadTemperatura | "" })} className={inputClass}>
                  <option value="">— Selecionar —</option>
                  {TEMPERATURAS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="orcamento" className={labelClass}>
                  {form.tipo_processo === "Arrendamento" ? "Renda máxima (€)" : "Orçamento máximo (€)"}
                </label>
                <input id="orcamento" type="number" min="0" step="50" value={form.orcamento_maximo} onChange={(e) => setForm({ ...form, orcamento_maximo: e.target.value })} className={inputClass} />
              </div>
            </div>

            <div>
              <label htmlFor="observacoes" className={labelClass}>Observações</label>
              <textarea id="observacoes" rows={3} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className={`${inputClass} resize-none`} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={handleClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
            {submitting ? "A guardar..." : "Criar Lead"}
          </button>
        </div>
      </form>
    </Modal>
  );
}