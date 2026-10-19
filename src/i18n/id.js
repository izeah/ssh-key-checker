// Indonesian UI strings, casual "kamu". en must have the same keys (src/lib/lang.test enforces it).
// Backticks mark code: <Rich> renders them as <code>. Key comments are user data and never live here.
export const id = {
  langName: "Bahasa Indonesia",
  theme: {
    dark: "Mode gelap",
  },
  meta: {
    title: "Cek pasangan SSH key",
  },
  hero: {
    title: "Cek apakah private key dan public key kamu benar-benar sepasang.",
    lede: "Tempel isinya atau pilih filenya. Semua pengecekan berjalan di browser ini, jadi kunci kamu tidak dikirim ke mana pun.",
    proof:
      "Mau bukti? Matikan internet setelah halaman ini terbuka, lalu cek. Hasilnya tetap keluar.",
  },
  fields: {
    private: {
      label: "Private key",
      hint: "Isi file seperti `~/.ssh/id_ed25519`, lengkap dari baris `-----BEGIN` sampai `-----END`.",
    },
    public: {
      label: "Public key",
      hint: "Satu baris dari file `.pub`, diawali `ssh-ed25519`, `ssh-rsa`, atau `ecdsa-sha2-`.",
    },
  },
  file: {
    choose: "Pilih file",
    drop: "atau tarik ke sini",
    dropping: "Lepas file di sini",
    clear: "Kosongkan",
    tip: "Folder `.ssh` tidak kelihatan? Di macOS, tekan Cmd + Shift + . (titik) di jendela pilih file. Di Windows, ketik `%USERPROFILE%\\.ssh` di kolom alamat.",
  },
  status: {
    read: (type, bits) => `Terbaca: ${type}, ${bits} bit`,
    comment: ", komentar",
    locked: "Dikunci passphrase, jadi hanya bagian publiknya yang dibaca.",
  },
  actions: {
    check: "Cek pasangannya",
    checking: "Mengecek…",
    clearBoth: "Kosongkan keduanya",
    sample: "Isi dengan pasangan contoh",
    swap: "Tukar posisinya",
  },
  sample: {
    note: "Ini pasangan contoh yang baru dibuat di browser kamu, bukan kunci siapa pun.",
  },
  result: {
    title: "Hasil",
    idle: "Jawabannya muncul di sini. Kami bandingkan fingerprint kedua kunci, lalu membuat tanda tangan dari data acak dengan private key dan memeriksanya dengan public key.",
    blocked: "Belum bisa dicek. Perbaiki dulu yang ditandai di atas.",
    type: "Tipe",
    comment: "Komentar",
    fingerprint: "Fingerprint",
    privateFingerprint: "Fingerprint private key",
    publicFingerprint: "Fingerprint public key",
    copy: "Salin fingerprint",
    copied: "Tersalin",
    copyFailed: "Gagal menyalin. Blok teksnya, lalu salin manual.",
    match: {
      title: "Sepasang.",
      body: "Public key ini milik private key kamu. Tanda tangan dari private key lolos verifikasi dengan public key.",
      note: "Nilai ini sama dengan yang dicetak `ssh-keygen -lf` dan yang tampil di halaman SSH keys GitHub.",
    },
    publicPart: {
      title: "Bagian publiknya cocok.",
      body: "Private key ini dikunci passphrase, dan kami sengaja tidak memintanya. Yang kami cek: public key yang tersimpan di dalam file private key sama persis dengan public key kamu. Untuk bukti penuh, jalankan `ssh-keygen -y -f <file private key>` di komputermu.",
    },
    mismatch: {
      title: "Bukan pasangan.",
      body: "Kedua kunci valid, tapi berasal dari pasangan yang berbeda. Biasanya file `.pub` tertukar dengan milik kunci lain. Coba file `.pub` yang namanya sama dengan file private key kamu.",
    },
    typeMismatch: {
      title: "Bukan pasangan.",
      body: (priv, pub) =>
        `Private key kamu bertipe ${priv}, sedangkan public key-nya ${pub}. Kunci beda tipe tidak mungkin sepasang.`,
    },
    damaged: {
      title: "Private key ini rusak.",
      body: "Bagian publiknya cocok, tapi bagian rahasianya tidak bisa membuat tanda tangan yang valid. Ambil salinan baru dari sumber aslinya, misalnya backup atau password manager kamu.",
    },
    noEd25519: {
      title: "Belum bisa dicek.",
      body: "Browser ini belum bisa memverifikasi kunci ED25519. Perbarui browser kamu, lalu cek lagi.",
    },
    refused: {
      title: "Belum bisa dicek.",
      body: "Format kuncinya benar, tapi browser ini menolak memakainya. Ini biasanya terjadi pada kunci RSA yang sangat pendek atau tidak standar.",
    },
    weakRsa:
      "Catatan: RSA 1024 bit sudah dianggap lemah. Kalau sempat, buat kunci baru dengan `ssh-keygen -t ed25519`.",
  },
  errors: {
    privateEmpty: "Tempel private key kamu dulu, atau pilih filenya.",
    privateNotKey:
      "Ini bukan private key SSH. Isinya harus diawali baris seperti `-----BEGIN OPENSSH PRIVATE KEY-----`.",
    privateIsPublic:
      "Ini public key, bukan private key. Sepertinya posisinya tertukar.",
    privateTruncated:
      "Kuncinya terpotong: baris penutup `-----END …-----` tidak ada. Salin ulang seluruh isi file, dari baris pertama sampai terakhir.",
    privateDamaged:
      "Ada karakter yang rusak di tengah kunci, jadi isinya tidak bisa dibaca. Salin ulang dari file aslinya, jangan diketik manual.",
    privateInconsistent:
      "Private key ini rusak: bagian-bagian di dalamnya tidak saling cocok. Ambil salinan baru dari sumber aslinya.",
    putty:
      "Ini file PuTTY (`.ppk`). Buka di PuTTYgen, pilih Conversions, lalu Export OpenSSH key, dan tempel hasilnya di sini.",
    encryptedPem:
      "Private key ini dikunci passphrase dalam format yang tidak menyimpan salinan public key, jadi tidak bisa dicek tanpa passphrase. Jalankan `ssh-keygen -y -f <file>` di terminal untuk melihat public key-nya.",
    dsa: "Kunci DSA tidak didukung. OpenSSH sendiri sudah berhenti mendukungnya, jadi sebaiknya buat kunci baru dengan `ssh-keygen -t ed25519`.",
    securityKey:
      "Ini kunci security key (FIDO), misalnya YubiKey. Bagian rahasianya ada di perangkat itu, bukan di file, jadi tidak bisa dicek di sini.",
    unsupportedType:
      "Tipe kunci ini belum didukung. Yang bisa dicek: ED25519, RSA, dan ECDSA (P-256, P-384, P-521).",
    refused:
      "Format kuncinya benar, tapi browser ini menolak memakainya. Ini biasanya terjadi pada kunci RSA yang sangat pendek atau tidak standar.",
    noEd25519:
      "Browser ini belum bisa memakai kunci ED25519. Perbarui browser kamu, lalu coba lagi.",
    multipleKeys: "Ada lebih dari satu kunci di sini. Tempel satu saja.",
    publicEmpty: "Tempel public key kamu dulu, atau pilih file `.pub`-nya.",
    publicNotKey:
      "Ini bukan public key SSH. Bentuknya satu baris: tipe kunci, spasi, lalu deretan karakter panjang yang biasanya diawali `AAAA`.",
    publicIsPrivate:
      "Ini private key, bukan public key. Sepertinya posisinya tertukar.",
    publicDamaged:
      "Deretan karakter kuncinya terpotong atau rusak. Salin ulang seluruh baris dari file `.pub`.",
    labelMismatch:
      "Label di depan kunci tidak sama dengan isinya. Sepertinya baris ini sudah diedit manual. Salin ulang dari file `.pub`.",
    certificate:
      "Ini sertifikat SSH (`-cert-v01`), bukan public key biasa. Pakai file `.pub` yang namanya tanpa `-cert`.",
    tooBig:
      "Ini terlalu besar untuk sebuah kunci SSH (lebih dari 32 KB). Pastikan kamu memilih file yang benar.",
    notText:
      "File ini bukan teks, jadi tidak mungkin kunci SSH. Pastikan kamu memilih file yang benar.",
    fileUnreadable:
      "File ini tidak bisa dibaca. Pilih lagi, atau tempel isinya langsung.",
  },
  faq: {
    title: "Pertanyaan yang sering muncul",
    items: [
      {
        q: "Apakah kuncinya dikirim ke server?",
        a: "Tidak. Kode di halaman ini membaca dan mengecek kunci di browser kamu, dan aturan keamanan halaman (Content Security Policy) membuat browser menolak koneksi keluar seperti fetch, XHR, atau WebSocket. Buktikan sendiri: buka tab Network di DevTools, lalu tekan Cek pasangannya. Tidak ada request baru yang muncul.",
      },
      {
        q: "Amankah menempel private key produksi di sini?",
        a: "Untuk kunci yang membuka server penting, jalur paling aman tetap terminal kamu sendiri. Satu hal yang tidak bisa dikendalikan halaman mana pun adalah extension browser yang boleh membaca semua halaman. Kalau ragu, pakai jendela private tanpa extension, atau jalankan `ssh-keygen -y -f ~/.ssh/id_ed25519` lalu bandingkan hasilnya dengan isi file `.pub` kamu.",
      },
      {
        q: "Format apa saja yang bisa dicek?",
        a: "Private key: OpenSSH, PEM (RSA dan EC), dan PKCS#8. Public key: satu baris OpenSSH (komentar boleh ada), RFC 4716, PEM, dan PKCS#1. Tipe kunci: ED25519, RSA, dan ECDSA (P-256, P-384, P-521). Yang tidak didukung: DSA, security key FIDO, file PuTTY `.ppk`, dan sertifikat SSH.",
      },
      {
        q: "Private key-nya dikunci passphrase. Bisa dicek?",
        a: "Sebagian. File OpenSSH menyimpan salinan public key di bagian yang tidak terkunci, jadi kami bisa memastikan salinan itu sama dengan public key kamu. Kami sengaja tidak meminta passphrase, sehingga bagian rahasianya tidak ikut diuji. Untuk PEM atau PKCS#8 yang terkunci, salinan itu tidak ada, jadi pakai `ssh-keygen -y -f <file>`.",
      },
      {
        q: "Apa itu fingerprint SHA256?",
        a: "Ringkasan pendek dari public key: `SHA256:` diikuti 43 karakter. GitHub, GitLab, dan `ssh-keygen -lf` menampilkan nilai yang sama, jadi kamu bisa mencocokkan kunci di laptop dengan kunci yang terdaftar di akun kamu tanpa membandingkan seluruh isinya.",
      },
    ],
  },
  footer: {
    line: "Tidak ada akun atau pelacak, dan cookie-nya hanya menyimpan pilihan bahasa dan tema kamu.",
    terms: "Syarat penggunaan",
    privacy: "Kebijakan privasi",
  },
  legal: {
    close: "Tutup",
    draft:
      "[REAL DATA] Teks contoh. Susunannya mengikuti prinsip privasi ISO/IEC 29100, tetapi ini bukan klaim sertifikasi dan belum ditinjau konsultan hukum. Ganti dengan teks resmi sebelum rilis.",
    terms: {
      title: "Syarat penggunaan",
      sections: [
        {
          h: "1. Penerimaan",
          p: [
            "Dengan memakai halaman ini, kamu setuju dengan syarat di bawah. Kalau tidak setuju, berhenti memakainya.",
          ],
        },
        {
          h: "2. Apa yang dilakukan layanan ini",
          p: [
            "SSH Key Checker membandingkan sebuah private key dengan sebuah public key dan memberi tahu apakah keduanya sepasang. Semua pengecekan berjalan di browser kamu.",
          ],
        },
        {
          h: "3. Tanggung jawab kamu atas kunci",
          p: [
            "Kamu yang memutuskan kunci mana yang ditempel di sini. Untuk kunci yang membuka sistem penting, pertimbangkan mengecek lewat terminal sendiri dengan `ssh-keygen`.",
            "Kamu bertanggung jawab atas keamanan perangkat dan browser yang kamu pakai, termasuk extension yang terpasang.",
          ],
        },
        {
          h: "4. Penggunaan yang dilarang",
          p: [
            "Jangan memakai halaman ini untuk memeriksa kunci milik orang lain tanpa izin pemiliknya, dan jangan mencoba mengganggu atau merusak layanannya.",
          ],
        },
        {
          h: "5. Tanpa jaminan",
          p: [
            "Layanan ini diberikan apa adanya. Hasil pengecekan adalah alat bantu, bukan jaminan keamanan sistem kamu.",
          ],
        },
        {
          h: "6. Batas tanggung jawab",
          p: [
            "Sejauh diizinkan hukum, penyedia layanan tidak bertanggung jawab atas kerugian yang timbul dari pemakaian atau ketidakmampuan memakai halaman ini. [REAL DATA]",
          ],
        },
        {
          h: "7. Perubahan syarat",
          p: [
            "Syarat ini bisa berubah. Versi terbaru selalu ada di halaman ini. [REAL DATA]",
          ],
        },
        {
          h: "8. Hukum yang berlaku dan kontak",
          p: [
            "Hukum yang berlaku, yurisdiksi, dan alamat kontak penyedia layanan: [REAL DATA]",
          ],
        },
      ],
    },
    privacy: {
      title: "Kebijakan privasi",
      sections: [
        {
          h: "1. Ringkasan",
          p: [
            "Halaman ini membaca kunci di browser kamu. Tidak ada server kami yang menerimanya.",
          ],
        },
        {
          h: "2. Data yang diproses",
          p: [
            "Isi private key dan public key yang kamu tempel atau pilih. Data ini hanya ada di memori browser selama halaman terbuka. Kunci tidak dikirim, tidak dicatat, dan tidak kami lihat.",
          ],
        },
        {
          h: "3. Tujuan",
          p: [
            "Hanya satu: mengecek apakah kedua kunci sepasang, atas permintaan kamu saat kamu menekan tombolnya. Data tidak dipakai untuk tujuan lain.",
          ],
        },
        {
          h: "4. Penyimpanan dan penghapusan",
          p: [
            "Halaman ini tidak memakai localStorage, sessionStorage, IndexedDB, maupun cookie untuk kunci. Isi kedua kolom hilang saat kamu menekan Kosongkan, memuat ulang halaman, atau menutup tab.",
          ],
        },
        {
          h: "5. Cookie",
          p: [
            "Hanya dua cookie fungsional, `lang` (bahasa) dan `theme` (tema), berlaku satu tahun. Isinya tidak mengandung data pribadi. Tidak ada cookie iklan, analitik, atau pelacak.",
          ],
        },
        {
          h: "6. Pihak ketiga",
          p: [
            "Halaman ini tidak memuat skrip, font, atau layanan dari pihak ketiga. Penyedia hosting bisa mencatat akses standar seperti alamat IP dan waktu kunjungan di log servernya: [REAL DATA]",
          ],
        },
        {
          h: "7. Keamanan",
          p: [
            "Aturan keamanan halaman (Content Security Policy) membuat browser menolak koneksi keluar dari halaman ini, dan halaman disajikan lewat HTTPS. Batasnya: extension browser yang boleh membaca semua halaman tetap bisa melihat apa yang kamu tempel.",
          ],
        },
        {
          h: "8. Hak kamu dan kontak",
          p: [
            "Karena kami tidak menyimpan data pribadi tentang kamu, tidak ada data yang perlu diakses atau dihapus dari sisi kami. Kontak untuk pertanyaan privasi: [REAL DATA]",
          ],
        },
        {
          h: "9. Perubahan kebijakan",
          p: [
            "Kebijakan ini bisa berubah. Versi terbaru selalu ada di halaman ini. [REAL DATA]",
          ],
        },
      ],
    },
  },
  notFound: {
    title: "Halaman ini tidak ada.",
    home: "Kembali ke pengecek kunci",
  },
};
