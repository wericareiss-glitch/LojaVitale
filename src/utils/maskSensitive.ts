/**
 * Utilitários para Ocultação e Anonimização de Dados Sensíveis (LGPD)
 * Vitale Concierge Estética Avançada
 */

export function maskCPF(cpf?: string): string {
  if (!cpf) return '***.***.***-**';
  const clean = cpf.replace(/\D/g, '');
  if (clean.length !== 11) return '***.***.***-**';
  // Exibe apenas os dígitos centrais protegendo início e fim: ***.123.456-**
  return `***.${clean.substring(3, 6)}.${clean.substring(6, 9)}-**`;
}

export function maskPhone(phone?: string): string {
  if (!phone) return '(86) 9****-****';
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 10) return '(86) 9****-****';
  const ddd = clean.substring(0, 2);
  const last2 = clean.slice(-2);
  return `(${ddd}) 9****-**${last2}`;
}

export function maskEmail(email?: string): string {
  if (!email || !email.includes('@')) return 'p***@email.com';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0] || 'u'}***@${domain}`;
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

export function maskAddress(address?: string, neighborhood?: string): string {
  const neigh = neighborhood ? `${neighborhood}, Teresina - PI` : 'Teresina - PI';
  return `Atendimento a Domicílio • ${neigh}`;
}

export function maskCardNumber(cardNumber?: string): string {
  if (!cardNumber) return '•••• •••• •••• ••••';
  const clean = cardNumber.replace(/\D/g, '');
  if (clean.length < 4) return '•••• •••• •••• ••••';
  const last4 = clean.slice(-4);
  return `•••• •••• •••• ${last4}`;
}
