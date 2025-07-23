export function cityNameFormat(nama: string): string {
    return nama
        .replace(/kabupaten\s*|kota\s*/gi, '') // Hapus 'kabupaten' atau 'kota'
        .trim() // Hapus spasi ekstra
        .toLowerCase() // Jadi lowercase semua
        .replace(/\b\w/g, (char) => char.toUpperCase()) // Kapital setiap awal kata
}
