export function convertPhoneNumber(phoneNumber: string): string {
  const digits = String(phoneNumber || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  // Local numbers without leading 0 (e.g. 812...) → assume ID
  if (digits.length >= 9 && digits.length <= 13) return `62${digits}`;
  return digits;
}
