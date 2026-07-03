"use client";

import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Loader2, Trash2, UserPlus } from "lucide-react";

interface Perfil {
  id: string;
  nome: string;
  email: string;
  cargo: string;
}

export function PerfilForm({ perfis: inicial }: { perfis: Perfil[] }) {
  const [perfis, setPerfis] = useState(inicial);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState("Agente");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const convidarAgente = async () => {
    if (!nome.trim() || !email.trim()) return;
    setLoading(true);
    setErro(null);
    setSucesso(null);
  
    const res = await fetch("/api/convidar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, nome, cargo }),
    });
  
    const data = await res.json();
  
    if (!res.ok) {
      setErro("Erro ao convidar: " + data.error);
      setLoading(false);
      return;
    }
  
    setPerfis([...perfis, { id: crypto.randomUUID(), nome, email, cargo }]);
    setNome("");
    setEmail("");
    setCargo("Agente");
    setSucesso("Convite enviado para " + email);
    setLoading(false);
  };

  const removerAgente = async (id: string) => {
    if (!confirm("Tens a certeza que queres remover este agente?")) return;

    await supabase.from("perfis").delete().eq("id", id);
    setPerfis(perfis.filter((p) => p.id !== id));
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card p-6">
        <h2 className="mb-4 font-semibold text-remax-blue-dark">Equipa actual</h2>
        <div className="space-y-3">
          {perfis.map((perfil) => (
            <div
              key={perfil.id}
              className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-remax-blue-light text-sm font-bold text-remax-blue">
                  {perfil.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{perfil.nome}</p>
                  <p className="text-xs text-brand-muted">{perfil.email} · {perfil.cargo}</p>
                </div>
              </div>
              <button
                onClick={() => removerAgente(perfil.id)}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-semibold text-remax-blue-dark flex items-center gap-2">
          <UserPlus className="h-4 w-4" /> Convidar agente
        </h2>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-brand-muted">Nome</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-remax-blue focus:outline-none focus:ring-2 focus:ring-remax-blue/20"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do agente"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-brand-muted">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-remax-blue focus:outline-none focus:ring-2 focus:ring-remax-blue/20"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@remax.pt"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-brand-muted">Cargo</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-remax-blue focus:outline-none"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
            >
              <option value="Agente">Agente</option>
              <option value="Consultor">Consultor</option>
              <option value="Assistente">Assistente</option>
              <option value="Director">Director</option>
            </select>
          </div>

          {erro && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
          {sucesso && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{sucesso}</p>}

          <button
            onClick={convidarAgente}
            disabled={loading || !nome.trim() || !email.trim()}
            className="btn-primary w-full justify-center"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar convite"}
          </button>
        </div>
      </div>
    </div>
  );
}