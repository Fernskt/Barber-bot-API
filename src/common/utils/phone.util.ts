export function normalizeWhatsAppNumber(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');

  if (digitsOnly.startsWith('549')) {
    return '54' + digitsOnly.slice(3);
  }

  return digitsOnly;
}
