// ─── Email ────────────────────────────────────────────────────────────────────
export function abrirEmailOutlook(email: string) {
  window.location.href = `mailto:${email}`;
}

// ─── Email em massa (BCC) ──────────────────────────────────────────────────────
export function abrirEmailOutlookMassa(
  emails: string[],
  assunto?: string,
  corpo?: string
) {
  const destinatarios = emails
    .map((e) => e.trim())
    .filter(Boolean)
    .join(",");

  if (!destinatarios) return;

  // Usa BCC para que os clientes não vejam os emails uns dos outros.
  // O campo "Para" fica com o próprio remetente (ou vazio, dependendo do cliente de email).
  const params = new URLSearchParams();
  params.set("bcc", destinatarios);
  if (assunto) params.set("subject", assunto);
  if (corpo) params.set("body", corpo);

  window.location.href = `mailto:?${params.toString()}`;
}

// ─── Calendário via .ics ──────────────────────────────────────────────────────
interface EventoCalendario {
  titulo: string;
  descricao?: string;
  inicio: Date;
  duracaoMinutos?: number;
  local?: string;
}

function formatarDataICS(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escaparTextoICS(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function abrirNoCalendarioOutlook(evento: EventoCalendario) {
  const inicio = evento.inicio;
  const fim = new Date(
    inicio.getTime() + (evento.duracaoMinutos ?? 30) * 60_000
  );

  // UID único para evitar duplicados se o utilizador descarregar duas vezes
  const uid = `crm-${Date.now()}@remax`;

  const linhas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//REMAX CRM//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatarDataICS(new Date())}`,
    `DTSTART:${formatarDataICS(inicio)}`,
    `DTEND:${formatarDataICS(fim)}`,
    `SUMMARY:${escaparTextoICS(evento.titulo)}`,
    evento.descricao
      ? `DESCRIPTION:${escaparTextoICS(evento.descricao)}`
      : null,
    evento.local ? `LOCATION:${escaparTextoICS(evento.local)}` : null,
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    `DESCRIPTION:Lembrete: ${escaparTextoICS(evento.titulo)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  const blob = new Blob([linhas], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // Nome do ficheiro visível no explorador
  a.download = `${evento.titulo.replace(/[^a-z0-9\-_\s]/gi, "").trim()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Liberta memória após um segundo
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}