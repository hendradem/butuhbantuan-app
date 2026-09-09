export function formatDate(date: string | Date, locale = "id-ID"): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  const intervals: [number, string][] = [[31536000,"tahun"],[2592000,"bulan"],[86400,"hari"],[3600,"jam"],[60,"menit"]];
  for (const [interval, label] of intervals) {
    const count = Math.floor(seconds / interval);
    if (count >= 1) return `${count} ${label} lalu`;
  }
  return "baru saja";
}
