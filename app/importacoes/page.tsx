import { Upload, FileSpreadsheet, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

const historico = [
  { ficheiro: "leads_idealista_maio.csv", tipo: "Leads", registos: 34, data: "21 Mai 2026", status: "concluido" },
  { ficheiro: "imoveis_portfolio.xlsx", tipo: "Imóveis", registos: 18, data: "19 Mai 2026", status: "concluido" },
  { ficheiro: "contactos_referencia.csv", tipo: "Leads", registos: 12, data: "15 Mai 2026", status: "concluido" },
  { ficheiro: "leads_facebook_maio.csv", tipo: "Leads", registos: 0, data: "22 Mai 2026", status: "erro" },
];

const statusConfig: Record<string, { icon: typeof CheckCircle2; label: string; class: string }> = {
  concluido: { icon: CheckCircle2, label: "Concluído", class: "text-emerald-600" },
  pendente: { icon: Clock, label: "Em processamento", class: "text-amber-600" },
  erro: { icon: AlertCircle, label: "Erro", class: "text-remax-red" },
};

export default function ImportacoesPage() {
  return (
    <div>
      <PageHeader
        title="Importações"
        description="Importe leads, imóveis e contactos em massa"
      />

      <div className="mb-8 card border-2 border-dashed border-slate-200 p-12 text-center hover:border-remax-blue/40 transition-colors">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-remax-blue-light">
          <Upload className="h-8 w-8 text-remax-blue" />
        </div>
        <h3 className="text-lg font-semibold text-remax-blue-dark">
          Arraste ficheiros ou clique para carregar
        </h3>
        <p className="mt-2 text-sm text-brand-muted">
          Suporta CSV e Excel (.xlsx) — Leads, Imóveis, Contactos
        </p>
        <button type="button" className="btn-primary mt-6">
          <FileSpreadsheet className="h-4 w-4" />
          Selecionar ficheiro
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-remax-blue-dark">Histórico de Importações</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">Ficheiro</th>
              <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">Tipo</th>
              <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">Registos</th>
              <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">Data</th>
              <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {historico.map((item) => {
              const cfg = statusConfig[item.status];
              const Icon = cfg.icon;
              return (
                <tr key={item.ficheiro} className="hover:bg-slate-50/60">
                  <td className="px-6 py-4 font-medium text-slate-800">{item.ficheiro}</td>
                  <td className="px-6 py-4">
                    <span className="badge-blue">{item.tipo}</span>
                  </td>
                  <td className="px-6 py-4 text-brand-muted">{item.registos}</td>
                  <td className="px-6 py-4 text-brand-muted">{item.data}</td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 font-medium ${cfg.class}`}>
                      <Icon className="h-4 w-4" />
                      {cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
