import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { PerfilForm } from "./PerfilForm";

export default async function PerfilPage() {
  const supabase = await createClient();

  const { data: perfis } = await supabase
    .from("perfis")
    .select("*")
    .order("created_at");

  return (
    <div>
      <PageHeader
        title="Perfil & Equipa"
        description="Membros da equipa Sa Farinha"
      />
      <PerfilForm perfis={perfis ?? []} />
    </div>
  );
}