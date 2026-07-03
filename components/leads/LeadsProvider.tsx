"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { NovoLeadModal } from "./NovoLeadModal";
import {
  fetchLeads,
  createLead,
  updateLeadEtapa,
  updateLead as updateLeadApi,
} from "@/lib/supabase/leads";
import type { Lead, LeadEtapa, NewLeadInput, UpdateLeadInput } from "@/types";

interface LeadsContextValue {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  hydrated: boolean;
  openNovoLeadModal: () => void;
  closeNovoLeadModal: () => void;
  refreshLeads: () => Promise<void>;
  addLead: (data: NewLeadInput) => Promise<string>;
  updateLeadEtapa: (id: string, etapa: LeadEtapa) => Promise<void>;
  updateLead: (id: string, data: UpdateLeadInput) => Promise<Lead>;
  getLead: (id: string) => Lead | undefined;
}

const LeadsContext = createContext<LeadsContextValue | null>(null);

export function useLeads() {
  const ctx = useContext(LeadsContext);
  if (!ctx) {
    throw new Error("useLeads deve ser usado dentro de LeadsProvider");
  }
  return ctx;
}

export function LeadsProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const refreshLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLeads();
      setLeads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar leads");
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    refreshLeads();
  }, [refreshLeads]);

  const openNovoLeadModal = useCallback(() => setModalOpen(true), []);
  const closeNovoLeadModal = useCallback(() => setModalOpen(false), []);

  const addLead = useCallback(
    async (data: NewLeadInput) => {
      const created = await createLead(data);
      setLeads((prev) => [created, ...prev]);
      return created.id;
    },
    []
  );

  const updateLeadEtapaHandler = useCallback(
    async (id: string, etapa: LeadEtapa) => {
      const updated = await updateLeadEtapa(id, etapa);
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
    },
    []
  );

  const updateLeadHandler = useCallback(
    async (id: string, data: UpdateLeadInput) => {
      const updated = await updateLeadApi(id, data);
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
      return updated;
    },
    []
  );

  const getLead = useCallback(
    (id: string) => leads.find((l) => l.id === id),
    [leads]
  );

  return (
    <LeadsContext.Provider
      value={{
        leads,
        loading,
        error,
        hydrated,
        openNovoLeadModal,
        closeNovoLeadModal,
        refreshLeads,
        addLead,
        updateLeadEtapa: updateLeadEtapaHandler,
        updateLead: updateLeadHandler,
        getLead,
      }}
    >
      {children}
      <NovoLeadModal open={modalOpen} onClose={closeNovoLeadModal} />
    </LeadsContext.Provider>
  );
}
