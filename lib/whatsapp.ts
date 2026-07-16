// ─── WhatsApp ──────────────────────────────────────────────────────────────────
// Abre uma conversa no WhatsApp Web/App já com o número (e opcionalmente uma
// mensagem) preenchidos, usando o link universal wa.me.
//
// Nota: isto NÃO é uma integração com a API oficial do WhatsApp Business —
// é só um atalho que abre o WhatsApp manualmente, tal como o "mailto:" faz
// para o email. Não fica histórico automático no CRM e não dá para enviar
// em massa (cada clique abre uma conversa de cada vez).

export function abrirWhatsApp(telemovel: string, mensagem?: string) {
    if (!telemovel) return;
  
    const apenasDigitos = telemovel.replace(/\D/g, "");
    if (!apenasDigitos) return;
  
    // Assume Portugal (+351) quando o número não já tem código de país
    // e tem o formato típico português (9 dígitos, começa por 9, 2 ou 3).
    let numero = apenasDigitos;
    if (!numero.startsWith("351") && numero.length === 9) {
      numero = `351${numero}`;
    }
  
    const params = mensagem ? `?text=${encodeURIComponent(mensagem)}` : "";
    window.open(`https://wa.me/${numero}${params}`, "_blank");
  }