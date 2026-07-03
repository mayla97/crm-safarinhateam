"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeads } from "./LeadsProvider";

interface NovoLeadButtonProps {
  className?: string;
}

export function NovoLeadButton({ className }: NovoLeadButtonProps) {
  const { openNovoLeadModal } = useLeads();

  return (
    <button
      type="button"
      onClick={openNovoLeadModal}
      className={cn("btn-primary", className)}
    >
      <Plus className="h-4 w-4" />
      Novo Lead
    </button>
  );
}
