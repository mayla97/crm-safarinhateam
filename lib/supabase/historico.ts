import { supabase } from "@/lib/supabase/client";

export interface HistoricoEntry {
  id: string;
  lead_id: string;
  tipo: string;
  descricao: string;
  created_by: string;
  created_at: string;
}

export async function fetchHistorico(leadId: string): Promise<HistoricoEntry[]> {
  const { data, error } = await supabase
    .from("lead_historico")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addHistorico(
  leadId: string,
  tipo: string,
  descricao: string,
  createdBy = "sistema"
): Promise<void> {
  await supabase.from("lead_historico").insert({
    lead_id: leadId,
    tipo,
    descricao,
    created_by: createdBy,
  });
}