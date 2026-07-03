import { FileText, Image, File, Upload, FolderOpen } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

const documentos = [
  { nome: "Proposta_Maria_Silva.pdf", tipo: "pdf", tamanho: "245 KB", data: "22 Mai 2026" },
  { nome: "Contrato_PROMESSA_REF2041.pdf", tipo: "pdf", tamanho: "1.2 MB", data: "20 Mai 2026" },
  { nome: "Fotos_T3_Matosinhos.zip", tipo: "zip", tamanho: "18.4 MB", data: "18 Mai 2026" },
  { nome: "Certificado_Energetico_REF2041.pdf", tipo: "pdf", tamanho: "890 KB", data: "15 Mai 2026" },
  { nome: "Planta_T4_Porto.jpg", tipo: "img", tamanho: "3.1 MB", data: "12 Mai 2026" },
];

const tipoIcon: Record<string, typeof FileText> = {
  pdf: FileText,
  zip: FolderOpen,
  img: Image,
};

const tipoCor: Record<string, string> = {
  pdf: "text-remax-red",
  zip: "text-amber-600",
  img: "text-remax-blue",
};

export default function DocumentosPage() {
  return (
    <div>
      <PageHeader
        title="Documentos"
        description="Contratos, propostas, certificados e ficheiros da equipa"
      >
        <button type="button" className="btn-primary">
          <Upload className="h-4 w-4" />
          Carregar
        </button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total de ficheiros", valor: "128", icon: File },
          { label: "Espaço utilizado", valor: "2.4 GB", icon: FolderOpen },
          { label: "Carregados este mês", valor: "23", icon: Upload },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card flex items-center gap-4 p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-remax-blue-light">
                <Icon className="h-5 w-5 text-remax-blue" />
              </div>
              <div>
                <p className="text-xs text-brand-muted">{stat.label}</p>
                <p className="text-xl font-bold text-remax-blue-dark">{stat.valor}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card overflow-hidden">
        <ul className="divide-y divide-slate-100">
          {documentos.map((doc) => {
            const Icon = tipoIcon[doc.tipo] ?? File;
            return (
              <li
                key={doc.nome}
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/60 transition-colors cursor-pointer"
              >
                <Icon className={`h-8 w-8 ${tipoCor[doc.tipo] ?? "text-slate-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{doc.nome}</p>
                  <p className="text-xs text-brand-muted">
                    {doc.tamanho} · {doc.data}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-sm font-medium text-remax-blue hover:text-remax-red transition-colors"
                >
                  Descarregar
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
