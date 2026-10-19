export const id = {
  langName: "Bahasa Indonesia",
  theme: {
    dark: "Mode gelap",
  },
  login: {
    title: "Masuk",
    email: "Email",
    password: "Kata sandi",
    submit: "Masuk",
    pending: "Sedang masuk…",
    errors: {
      invalidCredentials: "Email atau kata sandi salah.",
      tooManyAttempts:
        "Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.",
      failed: "Belum bisa masuk saat ini. Coba lagi sebentar lagi.",
      offline:
        "Server tidak dapat dihubungi. Periksa koneksi Anda, lalu coba lagi.",
    },
  },
  dashboard: {
    title: "Dasbor",
    loading: "Memuat profil Anda…",
    loadFailed: "Profil Anda gagal dimuat. Coba lagi nanti.",
    name: "Nama",
    email: "Email",
    roles: "Peran",
    signOut: "Keluar",
    signOutFailed: "Belum bisa keluar. Periksa koneksi Anda, lalu coba lagi.",
  },
  notFound: {
    title: "Halaman tidak ditemukan",
    home: "Ke dasbor",
  },
  pages: {
    privacy: {
      title: "Kebijakan privasi",
      description:
        "Data pribadi apa yang diproses Ssh Key Checker dan untuk apa.",
    },
    terms: {
      title: "Ketentuan penggunaan",
      description: "Ketentuan untuk menggunakan Ssh Key Checker.",
    },
  },
  legal: {
    draft:
      "[REAL DATA] Halaman ini membutuhkan teks aslinya dari Anda atau penasihat hukum Anda. Agent tidak menulisnya.",
  },
  error: {
    title: (status) => `Halaman ini tidak dapat dimuat (kode ${status})`,
  },
};
