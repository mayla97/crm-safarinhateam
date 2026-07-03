"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { PageHeader } from "@/components/ui/PageHeader";
import { Loader2 } from "lucide-react";

export default function SegurancaPage() {
  const [passwordAtual, setPasswordAtual] = useState("");
  const [novaPassword, setNovaPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const handleAlterarPassword = async () => {
    setErro(null);
    setSucesso(null);

    if (novaPassword !== confirmarPassword) {
      setErro("As passwords não coincidem.");
      return;
    }

    if (novaPassword.length < 6) {
      setErro("A password deve ter pelo menos 6 caracteres.");
      return;
    }

    setLoading(true);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.updateUser({
      password: novaPassword,
    });

    if (error) {
      setErro("Erro ao alterar password: " + error.message);
      setLoading(false);
      return;
    }

    setSucesso("Password alterada com sucesso.");
    setPasswordAtual("");
    setNovaPassword("");
    setConfirmarPassword("");
    setLoading(false);
  };

  return (
    <div>
      <PageHeader
        title="Segurança"
        description="Gerir password e autenticação"
      />

      <div className="card max-w-md p-6">
        <h2 className="mb-4 font-semibold text-remax-blue-dark">
          Alterar password
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-brand-muted">
              Nova password
            </label>
            <input
              type="password"
              value={novaPassword}
              onChange={(e) => setNovaPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-remax-blue focus:outline-none focus:ring-2 focus:ring-remax-blue/20"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-brand-muted">
              Confirmar nova password
            </label>
            <input
              type="password"
              value={confirmarPassword}
              onChange={(e) => setConfirmarPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-remax-blue focus:outline-none focus:ring-2 focus:ring-remax-blue/20"
              placeholder="••••••••"
            />
          </div>

          {erro && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}
          {sucesso && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {sucesso}
            </p>
          )}

          <button
            type="button"
            onClick={handleAlterarPassword}
            disabled={loading || !novaPassword || !confirmarPassword}
            className="btn-primary w-full justify-center"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Alterar password"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}