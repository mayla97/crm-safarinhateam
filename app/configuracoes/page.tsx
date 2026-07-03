import { User, Shield } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";

const seccoes = [
  {
    icon: User,
    titulo: "Perfil & Equipa",
    descricao: "Ver equipa, convidar e remover agentes",
    href: "/configuracoes/perfil",
  },
  {
    icon: Shield,
    titulo: "Segurança",
    descricao: "Alterar password",
    href: "/configuracoes/seguranca",
  },
];

export default function ConfiguracoesPage() {
  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Gerir equipa e segurança"
      />

      <div className="grid gap-4 max-w-2xl">
        {seccoes.map((sec) => {
          const Icon = sec.icon;
          return (
            <Link
              key={sec.titulo}
              href={sec.href}
              className="card flex items-center gap-4 p-5 text-left transition-shadow hover:shadow-md"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-remax-blue-light">
                <Icon className="h-5 w-5 text-remax-blue" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-remax-blue-dark">{sec.titulo}</h3>
                <p className="text-sm text-brand-muted">{sec.descricao}</p>
              </div>
              <span className="text-brand-muted">→</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}