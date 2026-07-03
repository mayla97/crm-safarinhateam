import { supabase } from "./client";
import { mapAgenteRow } from "./mappers";
import type { Agente } from "@/types";
import type { AgenteRow } from "@/types/database";

export async function fetchAgentes(): Promise<Agente[]> {
  const { data, error } = await supabase
    .from("agentes")
    .select("*")
    .order("nome", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => mapAgenteRow(row as AgenteRow));
}