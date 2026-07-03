# CRM Sa Farinha Team

CRM imobiliário RE/MAX para a equipa Sa Farinha — gestão de leads, pipeline, tarefas, calendário e relatórios.

## Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (auth + base de dados)
- **Lucide React** (ícones)

## Começar

```bash
npm install
cp .env.example .env.local
# Preencher NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Estrutura

```
app/                  # Páginas (App Router)
  page.tsx            # Dashboard
  leads/
  pipeline/
  tarefas/
  calendario/
  email/
  documentos/
  relatorios/
  importacoes/
  configuracoes/
components/
  layout/             # Sidebar, Header, MainLayout
  ui/                 # Componentes reutilizáveis
lib/
  supabase/           # Cliente browser, servidor e middleware
  utils.ts
types/
supabase/
  schema.sql          # Schema inicial para Supabase
```

## Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Copie URL e anon key para `.env.local`
3. Execute `supabase/schema.sql` no SQL Editor (se as tabelas ainda não existirem)
4. Execute `supabase/policies-anon.sql` para permitir leitura/escrita com a chave anon

Tabelas utilizadas: `leads`, `tarefas`, `agentes`, `lead_historico`, `documentos`, `emails`

## Identidade visual

- Azul RE/MAX: `#003DA5`
- Vermelho RE/MAX: `#DC1C2E`
- Fundo: `#F8FAFC` (cinza claro)
