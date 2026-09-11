/**
 * Copy shared by the public marketing pages (/landing, /tentang, /support).
 * Kept in one place so the FAQ answers and contact details never drift
 * between pages.
 */

export const SUPPORT_EMAIL = "hello@butuhbantuan.space";
export const DASHBOARD_URL = "https://dashboard.butuhbantuan.space";

/** Supporting colour families defined in assets/css/landing.css (.lp-tone-*). */
export type Tone = "red" | "amber" | "sky" | "green" | "rose";

export type EmergencyNumber = { number: string; label: string; icon: string; tone: Tone };

/** National emergency numbers — shown wherever someone might need help *now*. */
export const EMERGENCY_NUMBERS: EmergencyNumber[] = [
  { number: "112", label: "Panggilan darurat", icon: "lucide:siren", tone: "red" },
  { number: "119", label: "Ambulans / PSC", icon: "mynaui:ambulance-solid", tone: "rose" },
  { number: "110", label: "Polisi", icon: "lucide:shield", tone: "sky" },
  { number: "113", label: "Pemadam kebakaran", icon: "lucide:flame", tone: "amber" },
  { number: "115", label: "Basarnas / SAR", icon: "lucide:life-buoy", tone: "green" },
];

export type FaqCategory = "warga" | "unit" | "privasi" | "teknis";

export type Faq = { q: string; a: string; category: FaqCategory; featured?: boolean };

export const FAQ_CATEGORIES: { id: FaqCategory; label: string }[] = [
  { id: "warga", label: "Warga" },
  { id: "unit", label: "Unit emergency" },
  { id: "privasi", label: "Privasi & data" },
  { id: "teknis", label: "Teknis" },
];

export const FAQS: Faq[] = [
  {
    q: "Apakah ButuhBantuan menggantikan 112 atau 119?",
    a: "Tidak. ButuhBantuan melengkapi layanan resmi. Kalau kondisi mengancam nyawa, telepon 112 atau 119 lebih dulu, lalu pakai aplikasi untuk berbagi lokasi dan melacak petugas.",
    category: "warga",
    featured: true,
  },
  {
    q: "Apakah aplikasi ini gratis untuk warga?",
    a: "Ya. Semua fitur untuk warga gratis. Tidak ada registrasi wajib dan tidak ada iklan. Operasional didanai sponsor dan mitra pemerintah.",
    category: "warga",
    featured: true,
  },
  {
    q: "Kalau tidak ada unit terdekat, apa yang terjadi?",
    a: "Order diteruskan ke jaringan relawan komunitas terdekat. Kalau masih penuh, order dieskalasi ke unit di kabupaten tetangga. Kamu melihat estimasi yang realistis di setiap langkah.",
    category: "warga",
    featured: true,
  },
  {
    q: "Bagaimana cara cek status laporan saya?",
    a: "Buka menu Cek tiket, masukkan nomor HP yang dipakai saat melapor, lalu verifikasi dengan kode OTP. Semua tiket 90 hari terakhir akan tampil beserta statusnya.",
    category: "warga",
  },
  {
    q: "Apakah saya harus install aplikasi?",
    a: "Tidak wajib. Buka butuhbantuan.space langsung dari browser. Kalau mau lebih cepat dibuka, pasang ke layar utama HP lewat menu browser (Tambahkan ke layar utama).",
    category: "teknis",
  },
  {
    q: "Notifikasi tidak muncul, kenapa?",
    a: "Pastikan izin notifikasi untuk butuhbantuan.space aktif di pengaturan browser. Di iPhone, notifikasi web hanya berjalan setelah aplikasi dipasang ke layar utama.",
    category: "teknis",
  },
  {
    q: "Lokasi saya tidak akurat, apa yang harus dilakukan?",
    a: "Aktifkan GPS dan izinkan akses lokasi untuk browser. Hasil paling akurat didapat di area terbuka. Tulis juga patokan (nama gang, warna rumah, landmark) di deskripsi laporan.",
    category: "teknis",
  },
  {
    q: "Bagaimana unit emergency saya bergabung?",
    a: `Kirim email ke ${SUPPORT_EMAIL} dengan nama unit, wilayah operasi, dan kontak koordinator. Kami bantu proses onboarding tanpa biaya.`,
    category: "unit",
    featured: true,
  },
  {
    q: "Apa yang terjadi kalau petugas tidak merespons order?",
    a: "Setiap order punya batas waktu respons (SLA). Kalau petugas belum menerima dalam waktu itu, sistem otomatis meneruskan order ke unit terdekat berikutnya.",
    category: "unit",
  },
  {
    q: "Unit komunitas atau relawan boleh bergabung?",
    a: "Boleh. Jaringan kami mencakup unit resmi maupun komunitas relawan. Hubungi kami untuk proses onboarding.",
    category: "unit",
  },
  {
    q: "Data lokasi saya disimpan di mana?",
    a: "Koordinat GPS hanya dikirim saat kamu membuat laporan atau berbagi live location. Data disimpan di server Indonesia, dikirim lewat HTTPS, dan tidak dijual ke pihak ketiga.",
    category: "privasi",
    featured: true,
  },
  {
    q: "Siapa yang bisa melihat laporan saya?",
    a: "Laporan diteruskan ke unit yang ditugaskan dan koordinator wilayahnya. Nomor HP kamu dipakai untuk menghubungi dan verifikasi tiket, bukan untuk promosi.",
    category: "privasi",
  },
];
