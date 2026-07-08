"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, Filter, Loader2, Search, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { NovoLeadButton } from "./NovoLeadButton";
import { useLeads } from "./LeadsProvider";
import {
  getLeadDisplayName,
  getEtapaLabel,
  ETAPA_BADGE,
  ORIGENS,
  TIPOLOGIAS,
  TEMPERATURAS,
} from "@/lib/leads";
import type { LeadTemperatura } from "@/types";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
const ETAPAS_ARRENDAMENTO: Record<string, string> = {
  novo_lead: "Novo lead",
  em_tratamento: "Em tratamento",
  visita_agendada: "Visita agendada",
  visita_realizada: "Visita realizada",
  documentacao_recebida: "Documentação recebida",
  proposta_apresentada: "Proposta apresentada",
  contrato_assinado: "Contrato assinado",
};

function getEtapaTabela(lead: any) {
  if (lead.tipo_processo === "Arrendamento") {
    return (
      ETAPAS_ARRENDAMENTO[lead.etapa_arrendamento ?? "novo_lead"] ??
      "Novo lead"
    );
  }

  return getEtapaLabel(lead.etapa);
}
function normalizarTexto(valor: string) {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function mapEtapaVenda(valor: string) {
  const etapa = normalizarTexto(valor);

  const mapa: Record<string, string> = {
    novo_lead: "novo_lead",
    em_tratamento: "em_tratamento",
    em_contacto: "em_tratamento",
    qualificado: "qualificado",
    visita_agendada: "visita_agendada",
    visita_realizada: "visita_realizada",
    negociacao: "negociacao",
    proposta_enviada: "negociacao",
    proposta_apresentada: "negociacao",
    cpcv_assinado: "cpcv_assinado",
    aguarda_escritura: "aguarda_escritura",
    escritura_realizada: "escritura_realizada",
  };

  return mapa[etapa] ?? "novo_lead";
}

function mapEtapaArrendamento(valor: string) {
  const etapa = normalizarTexto(valor);

  const mapa: Record<string, string> = {
    novo_lead: "novo_lead",
    em_tratamento: "em_tratamento",
    em_contacto: "em_tratamento",
    visita_agendada: "visita_agendada",
    visita_realizada: "visita_realizada",
    documentacao_recebida: "documentacao_recebida",
    documentacao_arrendamento: "documentacao_recebida",
    proposta_apresentada: "proposta_apresentada",
    contrato_enviado: "proposta_apresentada",
    contrato_assinado: "contrato_assinado",
  };

  return mapa[etapa] ?? "novo_lead";
}
function parseCSVLine(linha: string, sep: string): string[] {
  const resultado: string[] = [];
  let atual = "";
  let dentroAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const char = linha[i];

    if (char === '"') {
      if (dentroAspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        dentroAspas = !dentroAspas;
      }
    } else if (char === sep && !dentroAspas) {
      resultado.push(atual.trim());
      atual = "";
    } else {
      atual += char;
    }
  }

  resultado.push(atual.trim());
  return resultado;
}
export function LeadsTable() {
  const { leads, loading, error, refreshLeads, addLead } = useLeads();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [search, setSearch] = useState("");
  const [etapaFiltro, setEtapaFiltro] = useState("todos");
  const [origemFiltro, setOrigemFiltro] = useState("todos");
  const [tipologiaFiltro, setTipologiaFiltro] = useState("todos");
  const [temperaturaFiltro, setTemperaturaFiltro] = useState("todos");
  const [zonaFiltro, setZonaFiltro] = useState("todos");
  const [estadoFiltro, setEstadoFiltro] = useState("activos");
  const [mostrarFiltros, setMostrarFiltros] = useState(true);
  const [importando, setImportando] = useState(false);
  const [tipoProcessoFiltro, setTipoProcessoFiltro] = useState("todos");
  const searchParams = useSearchParams();

const [semContactoFiltro, setSemContactoFiltro] = useState(
  searchParams.get("filtro") === "sem_contacto"
);
const [seleccionados, setSeleccionados] = useState<string[]>([]);
const [apagando, setApagando] = useState(false);

const toggleSeleccionar = (id: string) => {
  setSeleccionados((prev) =>
    prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
  );
};

const toggleTodos = () => {
  if (seleccionados.length === leadsFiltrados.length) {
    setSeleccionados([]);
  } else {
    setSeleccionados(leadsFiltrados.map((l) => l.id));
  }
};

const apagarSeleccionados = async () => {
  if (!confirm(`Tens a certeza que queres apagar ${seleccionados.length} lead(s)? Esta acção não pode ser desfeita.`)) return;
  setApagando(true);
  for (const id of seleccionados) {
    await supabase.from("lead_historico").delete().eq("lead_id", id);
    await supabase.from("tarefas").delete().eq("lead_id", id);
    await supabase.from("leads").delete().eq("id", id);
  }
  setSeleccionados([]);
  await refreshLeads();
  setApagando(false);
};
  const leadsFiltrados = useMemo(() => {
    return leads.filter((lead) => {
      const nome = getLeadDisplayName(lead).toLowerCase();
      const termo = search.toLowerCase();
      const matchZona =
  zonaFiltro === "todos" || lead.zona_interesse === zonaFiltro;

      const estado =
        (lead as any).estado_final ??
        (lead as any).estado_lead ??
        "Activo";
        const tipoProcesso =
  (lead as any).tipo_processo ?? "Compra/Venda";

      const matchSearch =
        nome.includes(termo) ||
        (lead.email ?? "").toLowerCase().includes(termo) ||
        (lead.telemovel ?? "").includes(search) ||
        (lead.zona_interesse ?? "").toLowerCase().includes(termo);
        const matchTipoProcesso =
  tipoProcessoFiltro === "todos" || tipoProcesso === tipoProcessoFiltro;

        const etapaAtual =
        (lead as any).tipo_processo === "Arrendamento"
          ? (lead as any).etapa_arrendamento
          : lead.etapa;
      
      const matchEtapa =
        etapaFiltro === "todos" || etapaAtual === etapaFiltro;

      const matchOrigem =
        origemFiltro === "todos" || lead.origem === origemFiltro;

      const matchTipologia =
        tipologiaFiltro === "todos" || lead.tipologia === tipologiaFiltro;

      const matchTemperatura =
        temperaturaFiltro === "todos" || lead.temperatura === temperaturaFiltro;

        const matchEstado =
        estadoFiltro === "todos" ||
        (estadoFiltro === "activos" && estado === "Activo") ||
        estado === estadoFiltro;
        const setesDiasAtras = new Date();
setesDiasAtras.setDate(setesDiasAtras.getDate() - 7);

const matchSemContacto = !semContactoFiltro ||
  (new Date((lead as any).updated_at) < setesDiasAtras &&
   ((lead as any).estado_final ?? (lead as any).estado_lead ?? "Activo") === "Activo");

   return (
    matchSearch &&
    matchTipoProcesso &&
    matchEtapa &&
    matchOrigem &&
    matchZona &&
    matchTipologia &&
    matchTemperatura &&
    matchEstado &&
    matchSemContacto
  );
    });
  }, [
    leads,
    search,
    etapaFiltro,
    origemFiltro,
    zonaFiltro,
    tipologiaFiltro,
    temperaturaFiltro,
    estadoFiltro,
    tipoProcessoFiltro,
    semContactoFiltro,
  ]);
  const zonasDisponiveis = Array.from(
    new Set(
      leads
        .map((lead: any) => lead.zona_interesse)
        .filter(Boolean)
    )
  ).sort();
  const limparFiltros = () => {
    setSearch("");
    setEtapaFiltro("todos");
    setOrigemFiltro("todos");
    setZonaFiltro("todos");
    setTipologiaFiltro("todos");
    setTemperaturaFiltro("todos");
    setEstadoFiltro("activos");
    setTipoProcessoFiltro("todos");
    setSemContactoFiltro(false);
  };

  const exportarLeads = () => {
    const headers = [
      "Data de entrada",
      "Nome",
      "Apelido",
      "Email",
      "Telemóvel",
      "Tipo de processo",
      "Agente",
      "Tipologia",
      "Zona",
      "Origem",
      "Temperatura",
      "Etapa",
      "Estado",
    ];
  
    const rows = leadsFiltrados.map((lead) => {
      const estado =
        (lead as any).estado_final ??
        (lead as any).estado_lead ??
        "Activo";
  
      return [
        (lead as any).data_entrada ?? "",
        lead.nome ?? "",
        lead.apelido ?? "",
        lead.email ?? "",
        lead.telemovel ?? "",
        
        (lead as any).tipo_processo ?? "Compra/Venda",
        (lead as any).agente_nome ?? "",
        lead.tipologia ?? "",
        lead.zona_interesse ?? "",
        lead.origem ?? "",
        lead.temperatura ?? "",
        getEtapaTabela(lead),
        estado,
      ];
    });
  
    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(";")
      )
      .join("\n");
  
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
  
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
  
    link.href = url;
    link.download = "leads.csv";
    link.click();
  
    URL.revokeObjectURL(url);
  };

  const importarLeads = async (file: File) => {
    setImportando(true);
    let importados = 0;
    let ignorados = 0;
  
    try {
      const text = await file.text();
      const linhas = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  
      if (linhas.length < 2) return;
  
      const normalizarHeader = (h: string) => {
        return h
          .trim()
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
      };
      const separador = ";";

      const headers = parseCSVLine(linhas[0], separador).map(normalizarHeader);
  
      for (const linha of linhas.slice(1)) {
        try {
          const valores = parseCSVLine(linha, separador);
          const obj: Record<string, string> = {};
          headers.forEach((header, index) => {
            const valor = valores[index] ?? "";
          
            obj[header] = valor.trim();
          });headers.forEach((header, index) => {
            obj[header] = (valores[index] ?? "").trim();
          });
  
          const nome = obj["nome"] || "";
          const apelido = obj["apelido"] || "";
          const email = obj["email"] || "";
          const telemovel = obj["telemóvel"] || obj["telemovel"] || "";
          const tipoProcesso =
  obj["tipo de processo"] || obj["tipoprocesso"] || "Compra/Venda";
  const etapaTexto = obj["etapa"] || obj["etapas"] || "";
          const estado = obj["estado"] || "Activo";
          const origem = obj["origem"] || "Importação CSV";
  
          const converterData = (d: string) => {
            if (!d) return null;
            const partes = d.split("/");
            if (partes.length === 3) return `${partes[2]}-${partes[1].padStart(2,"0")}-${partes[0].padStart(2,"0")}`;
            return null;
          };
  
          const converterOrcamento = (v: string) => {
            if (!v) return null;
            const limpo = v.replace(/€/g, "").replace(/\s/g, "").replace(",", ".");
            const num = parseFloat(limpo);
            return isNaN(num) ? null : num;
          };
  
          const etapaVenda = tipoProcesso === "Arrendamento" ? "novo_lead" : mapEtapaVenda(etapaTexto);
          const etapaArr = tipoProcesso === "Arrendamento" ? mapEtapaArrendamento(etapaTexto) : "novo_lead";
  
          if (!nome && !email && !telemovel) {
            ignorados += 1;
            continue;
          }
  
          const duplicado = leads.find((lead: any) => {
            const telExistente = (lead.telemovel ?? "").replace(/\s/g, "").trim();
            const telNovo = telemovel.replace(/\s/g, "").trim();
            const emailExistente = (lead.email ?? "").trim().toLowerCase();
            const emailNovo = email.trim().toLowerCase();
            return (
              (telNovo && telExistente === telNovo) ||
              (emailNovo && emailExistente === emailNovo)
            );
          });
  
          if (duplicado) {
            ignorados += 1;
            continue;
          }
  
          await addLead({
            nome: nome || "Sem nome",
            apelido: apelido || null,
            email: email || null,
            telemovel: telemovel || null,
            tipologia: obj["tipologia"] || null,
            zona_interesse: obj["zona"] || null,
            origem,
            agente_id: null,
            temperatura: (obj["temperatura"] as LeadTemperatura) || null,
            orcamento_maximo: converterOrcamento(obj["orçamento"] || obj["orcamento"] || ""),
            observacoes: obj["observações"] || obj["observacoes"] || null,
            ...({
              data_entrada: converterData(obj["lead antigo sem historico"] || obj["data de entrada"] || obj["datadeentrada"] || ""),
              tipo_processo: tipoProcesso,
              etapa: etapaVenda,
              etapa_arrendamento: etapaArr,
              estado_final: estado,
              estado_lead: estado,
              motivo_perda: obj["motivo de perda"] || null,
            } as any),
          });
  
          importados += 1;
        } catch (err) {
          console.error("Erro na linha:", err);
          ignorados += 1;
        }
      }
  
      await refreshLeads();
      alert(`Importação terminada.\n\nImportados: ${importados}\nIgnorados: ${ignorados}`);
    } finally {
      setImportando(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Gestão de contactos e potenciais clientes"
      >
        <button type="button" onClick={exportarLeads} className="btn-secondary">
          <Download className="h-4 w-4" />
          Exportar
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="btn-secondary"
          disabled={importando}
        >
          <Upload className="h-4 w-4" />
          {importando ? "A importar..." : "Importar"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) importarLeads(file);
          }}
        />

        <button
          type="button"
          onClick={() => setMostrarFiltros((v) => !v)}
          className="btn-secondary"
        >
          <Filter className="h-4 w-4" />
          Filtrar
        </button>
        {seleccionados.length > 0 && (
  <button
    type="button"
    onClick={apagarSeleccionados}
    disabled={apagando}
    className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
  >
    {apagando ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
      <Trash2 className="h-4 w-4" />
    )}
    Apagar {seleccionados.length} seleccionado(s)
  </button>
)}
        <NovoLeadButton />
      </PageHeader>

      {error && (
        <div className="mb-4 rounded-lg border border-remax-red/30 bg-remax-red-light px-4 py-3 text-sm text-remax-red">
          {error}
          <button
            type="button"
            onClick={() => refreshLeads()}
            className="ml-2 font-semibold underline"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {mostrarFiltros && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <div className="relative xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Nome, telefone, email ou zona..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-remax-blue"
              />
            </div>
            <select
  value={tipoProcessoFiltro}
  onChange={(e) => setTipoProcessoFiltro(e.target.value)}
  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
>
  <option value="todos">Todos processos</option>
  <option value="Compra/Venda">Compra/Venda</option>
  <option value="Arrendamento">Arrendamento</option>
</select>
<select
  value={etapaFiltro}
  onChange={(e) => setEtapaFiltro(e.target.value)}
  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
>
  <option value="todos">Todas etapas</option>

  <option value="novo_lead">Novo lead</option>
  <option value="em_tratamento">Em tratamento</option>
  <option value="qualificado">Qualificado</option>
  <option value="visita_agendada">Visita agendada</option>
  <option value="visita_realizada">Visita realizada</option>

  <option value="negociacao">Negociação</option>
  <option value="cpcv_assinado">CPCV assinado</option>
  <option value="aguarda_escritura">Aguarda escritura</option>
  <option value="escritura_realizada">Escritura realizada</option>

  <option value="documentacao_recebida">Documentação recebida</option>
  <option value="proposta_apresentada">Proposta apresentada</option>
  <option value="contrato_assinado">Contrato assinado</option>
</select>

            <select value={origemFiltro} onChange={(e) => setOrigemFiltro(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="todos">Todas origens</option>
              {ORIGENS.map((origem) => (
                <option key={origem} value={origem}>{origem}</option>
              ))}
            </select>
            <select
  value={zonaFiltro}
  onChange={(e) => setZonaFiltro(e.target.value)}
  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
>
  <option value="todos">Todas zonas</option>

  {zonasDisponiveis.map((zona) => (
    <option key={zona} value={zona}>
      {zona}
    </option>
  ))}
</select>

            <select value={tipologiaFiltro} onChange={(e) => setTipologiaFiltro(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="todos">Todas tipologias</option>
              {TIPOLOGIAS.map((tipologia) => (
                <option key={tipologia} value={tipologia}>{tipologia}</option>
              ))}
            </select>

            <select value={temperaturaFiltro} onChange={(e) => setTemperaturaFiltro(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <option value="todos">Todas temperaturas</option>
              {TEMPERATURAS.map((temperatura) => (
                <option key={temperatura.value} value={temperatura.value}>
                  {temperatura.label}
                </option>
              ))}
            </select>

            <select
  value={estadoFiltro}
  onChange={(e) => setEstadoFiltro(e.target.value)}
  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
>
  <option value="activos">Só activos</option>
  <option value="todos">Todos estados</option>
  <option value="Activo">Activo</option>
  <option value="Perdido">Perdido</option>
  <option value="Pausado">Pausado</option>
  <option value="Concluído">Concluído</option>
</select>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-brand-muted">
              {leadsFiltrados.length} lead{leadsFiltrados.length === 1 ? "" : "s"} encontrado{leadsFiltrados.length === 1 ? "" : "s"}
            </p>

            <button
              type="button"
              onClick={limparFiltros}
              className="text-sm font-medium text-remax-blue hover:text-remax-red"
            >
              Limpar filtros
            </button>
          </div>
        </div>
      )}
      {semContactoFiltro && (
  <div className="mb-4 flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
    <span>A mostrar leads sem contacto há mais de 7 dias</span>
    <button
      onClick={() => setSemContactoFiltro(false)}
      className="font-semibold underline"
    >
      Limpar
    </button>
  </div>
)}

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-brand-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
            A carregar leads...
          </div>
        ) : leadsFiltrados.length === 0 ? (
          <div className="py-16 text-center text-brand-muted">
            Nenhum lead encontrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80">
                  <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">Nome</th>
                  <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">Contacto</th>
                  <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">Tipologia</th>
                  <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">Zona</th>
                  <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">Origem</th>
                  <th className="px-6 py-3 text-left font-semibold text-remax-blue-dark">Etapa</th>
                  <th className="px-6 py-3 text-right font-semibold text-remax-blue-dark">Ações</th>
                  <th className="px-4 py-3">
  <input
    type="checkbox"
    checked={seleccionados.length === leadsFiltrados.length && leadsFiltrados.length > 0}
    onChange={toggleTodos}
    className="rounded border-slate-300"
  />
</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {leadsFiltrados.map((lead) => {
                  const etapaLabel = getEtapaTabela(lead);
                  const href = `/leads/${lead.id}`;

                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
  <td className="px-4 py-4">
    <input
      type="checkbox"
      checked={seleccionados.includes(lead.id)}
      onChange={() => toggleSeleccionar(lead.id)}
      className="rounded border-slate-300"
    />
  </td>
  <td className="px-6 py-4 font-medium text-slate-800">
    <Link href={href} className="hover:text-remax-blue">
      {getLeadDisplayName(lead)}
    </Link>
  </td>
  <td className="px-6 py-4 text-brand-muted">
    <div>{lead.email ?? "—"}</div>
    <div className="text-xs">{lead.telemovel ?? "—"}</div>
  </td>
  <td className="px-6 py-4 text-brand-muted">{lead.tipologia ?? "—"}</td>
  <td className="px-6 py-4 text-brand-muted">{lead.zona_interesse ?? "—"}</td>
  <td className="px-6 py-4 text-brand-muted">{lead.origem ?? "—"}</td>
  <td className="px-6 py-4">
    <span className={ETAPA_BADGE[etapaLabel] ?? "badge-blue"}>
      {etapaLabel}
    </span>
  </td>
  <td className="px-6 py-4 text-right">
    <Link
      href={href}
      className="inline-flex text-sm font-medium text-remax-blue hover:text-remax-red transition-colors"
    >
      Ver detalhe
    </Link>
  </td>
</tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}