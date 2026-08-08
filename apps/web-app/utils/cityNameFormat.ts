export function cityNameFormat(nama: string): string {
  return nama
    .replace(/kabupaten\s*|kota\s*/gi, "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
