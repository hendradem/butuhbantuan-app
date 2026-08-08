export function convertPhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/^0/, "62");
}
