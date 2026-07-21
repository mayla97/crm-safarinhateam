"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function DefinirSenhaPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [sessaoValida, setSessaoValida] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processarLinkDeConvite = async () => {
      // Formato actual do Supabase para convites/reset: vem na própria URL
      // visível como ?token_hash=...&type=invite (em vez do antigo
      // #access_token=... escondido no hash). Precisa de ser trocado
      // explicitamente por uma sessão com verifyOtp — o getSession()
      // sozinho não trata este formato.
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      if (tokenHash && type) {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as "invite" | "recovery" | "email",
        });

        if (!verifyError) {
          setSessaoValida(true);
          setChecking(false);
          return;
        }
      }

      // Fallback: formato antigo (#access_token=...), que o supabase-js
      // já processa sozinho via detectSessionInUrl.
      const { data } = await supabase.auth.getSession();
      setSessaoValida(!!data.session);
      setChecking(false);
    };

    processarLinkDeConvite();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (senha.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (senha !== confirmarSenha) {
      setError("As senhas não coincidem.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: senha,
    });
    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.push("/");
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-remax-blue" />
      </div>
    );
  }

  if (!sessaoValida) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-md">
          <h1 className="mb-2 text-lg font-semibold text-remax-blue-dark">
            Link inválido ou expirado
          </h1>
          <p className="text-sm text-brand-muted">
            Pede a quem te convidou para enviar um novo convite.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md"
      >
        <h1 className="mb-6 text-lg font-semibold text-remax-blue-dark">
          Define a tua senha
        </h1>

        {error && (
          <div className="mb-4 rounded-lg bg-remax-red-light px-4 py-3 text-sm text-remax-red">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="mb-1 block text-xs font-medium text-brand-muted">
            Nova senha
          </label>
          <input
            type="password"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-remax-blue focus:outline-none focus:ring-2 focus:ring-remax-blue/20"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-xs font-medium text-brand-muted">
            Confirmar senha
          </label>
          <input
            type="password"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-remax-blue focus:outline-none focus:ring-2 focus:ring-remax-blue/20"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={saving} className="btn-primary w-full justify-center">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar senha e entrar"}
        </button>
      </form>
    </div>
  );
}