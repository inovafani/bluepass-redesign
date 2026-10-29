# Panduan tes: Admin, CRM, dan website Bluepass

Dibuat 2026-10-28 dari kode yang ada sekarang (bukan dari ingatan). Fokus: **admin Bluepass** (`/admin/*`) dan **CRM** (`/crm`), lalu website publik.

Cara pakai: kerjakan berurutan, centang `[x]` kalau hasilnya sesuai kolom "Harus terjadi". Kalau tidak sesuai, catat di baris bawahnya: halaman, apa yang kamu klik, apa yang muncul. Itu cukup untuk saya perbaiki.

---

## 0. Baca ini dulu (database dibagi dengan production)

Lokal dan production memakai **satu database yang sama**. Jadi apa pun yang kamu simpan di `localhost:3000/3001` benar-benar tersimpan di data live. Aturannya:

1. **Semua data uji pakai tanda ini**, supaya angka Traction tidak tercemar: nama perusahaan berakhiran `(test)`, email berdomain `@ops.bluepass.co` (atau `@example.com`).
2. **Jangan tekan tombol yang mengirim sesuatu ke orang sungguhan**: lihat tabel di bawah.
3. **Jangan membayar dengan kartu asli.** Untuk tes pembayaran hanya kartu uji Stripe `4242 4242 4242 4242` (tanggal masa depan, CVC bebas), dan hanya kalau `.env` memakai kunci `sk_test_...`.
4. Yang kamu **publikasikan** (blog, trip affiliate, halaman operator) langsung tampil di bluepass.co. Ambil kembali setelah tes (lihat bagian 9).

| Tombol | Apa yang terjadi | Aman dites? |
|---|---|---|
| Outreach → **Send batch** | Memasukkan orang ke Instantly (cold email sungguhan) bila status "live" | Hanya kalau halaman bilang **rehearsal / nothing was sent**. Kalau live, **jangan** |
| Payouts → **Release** (Indonesia) | Memindahkan uang lewat Stripe Connect | **Jangan** tanpa data uji dan akun Connect uji |
| Payouts → **Settle** (Australia), **Mark paid** | Mencatat uang sudah dibayar | Hanya pada baris uji |
| Approvals → **Approve** | Operator/partner jadi aktif; bisa mengirim email ke alamatnya | Hanya pada data buatanmu sendiri |
| Operator baru → undangan login | Mengirim email undangan | Pakai email `@ops.bluepass.co` yang kamu kendalikan, atau alamat emailmu sendiri |
| FareHarbor **Import** | Menulis laporan ke database | Preview dulu; import hanya file uji |
| Blog **Delete** | Menghapus permanen | Hanya artikel uji |

---

## 1. Persiapan

- [ ] Login ke `/login` dengan akun admin (email ada di `BLUEPASS_ADMIN_EMAILS` atau peran ADMIN).
- [ ] Buka `/admin`. **Harus terjadi:** halaman Admin terbuka, ada panel Traction, tile-tile section.
- [ ] Buka `/admin` dari jendela **tanpa login** (incognito). **Harus terjadi:** diarahkan ke login, bukan halaman admin.
- [ ] Login sebagai akun **bukan admin** (mis. dummy operator), buka `/admin` dan `/crm`. **Harus terjadi:** ditolak/dialihkan, tidak ada data admin yang terlihat.
- [ ] Siapkan di terminal: `npx tsc --noEmit` lalu `npm test`. **Harus terjadi:** keduanya bersih (tes rails memakai `vitest.rails.config.ts` dan **hanya** boleh ke database lokal terpisah, jangan dijalankan ke database bersama ini).

Siapkan juga satu email milikmu yang bisa dibuka (untuk menerima email uji) dan Stripe dalam mode test.

---

## 2. Admin: Overview dan Traction (`/admin`)

- [ ] Panel **Traction** menampilkan: Live operators, Live trips, Bookings, Guests booked, Traveller accounts, On the waitlist.
- [ ] Klik **Include test data**. **Harus terjadi:** URL jadi `/admin?test=1`, angka bisa naik (akun uji ikut dihitung), teks berubah jadi "Test and placeholder accounts are included". Klik **Leave them out** untuk kembali.
- [ ] Bandingkan "On the waitlist" dengan jumlah baris waitlist sebenarnya (traveller/operator/partner). **Harus terjadi:** total = jumlah ketiganya.
- [ ] Bagian uang (kalau ada booking): satu kartu **per mata uang**, tidak pernah dijumlahkan lintas mata uang.
- [ ] Grafik "Bookings by week": 8 batang, minggu kosong tetap tampil sebagai batang abu-abu.
- [ ] OverviewStats di bawahnya: kalau Kai tidak terjangkau, tampil sebagai **tidak terjangkau**, bukan angka 0.
- [ ] Semua tile section ada dan membuka halaman yang benar: Approvals, Operators, Affiliate trips, Partners, Blog, Prepared pages, Creators, Visits, Outreach, Rezdy & FareHarbor, Payouts & Ledger, plus **Outreach CRM**.
- [ ] Badge Approvals: "N waiting" bila ada, "All clear" bila kosong.

---

## 3. Admin: orang dan bisnis

### 3.1 Approvals (`/admin/approvals`)

Buat data uji dulu: ajukan partner lewat `/partners/apply` (email `tes-partner@ops.bluepass.co`, nama berakhiran `(test)`).

- [ ] Pengajuan muncul sebagai kartu, badge di menu bertambah.
- [ ] Tab/filter berpindah antar jenis (claim operator vs aplikasi partner), hitungan di tab benar.
- [ ] **Decline** dulu pada satu data uji: minta konfirmasi dua langkah, lalu kartu hilang/berstatus declined.
- [ ] Buat satu lagi, **Approve**. **Harus terjadi:** kartu hilang dari antrean, pada `/admin/partners` statusnya APPROVED, dan akun itu bisa membuka `/partner-portal`.
- [ ] Buka halaman yang sama di dua tab, putuskan di tab pertama, lalu tekan tombol di tab kedua. **Harus terjadi:** pesan error yang jelas, bukan crash atau keputusan ganda.

### 3.2 Operators (`/admin/operators`, `/new`, `/[id]`)

- [ ] Daftar operator: tiap baris punya Company, Status, Payout method, Country, Rezdy, Payout on file, **Edit →**. Di HP berubah jadi kartu.
- [ ] **New operator**: isi Company name `Admin Test Tours (test)`, Payout contact email (emailmu), WhatsApp, Website, Country.
- [ ] Ganti **Payout method** ke tiap pilihan. **Harus terjadi:** isian yang muncul menyesuaikan (Stripe Connect account ID, Airwallex reference, atau kolom rekening bank per-field).
- [ ] Kosongkan Company name lalu simpan. **Harus terjadi:** error di field itu dan field itu disorot, data lain tidak hilang.
- [ ] Isi rekening bank salah (BSB 2 digit). **Harus terjadi:** ditolak dengan pesan spesifik per field.
- [ ] Simpan dengan benar. **Harus terjadi:** layar sukses dengan nama dan email payout contact, serta kartu **undangan login** untuk operator.
- [ ] Buat lagi dengan nama **sama persis**. **Harus terjadi:** peringatan duplikat dengan centang konfirmasi `confirmDuplicate`; tanpa centang tidak tersimpan.
- [ ] Buka **Edit →** pada operator uji. Ubah info dasar, simpan. **Harus terjadi:** tersimpan, tampil di daftar.
- [ ] Ubah payout: **harus** ada centang konfirmasi (`confirm`) sebelum bisa disimpan. Tanpa centang → ditolak.
- [ ] Detail bank tidak pernah bisa dibaca balik oleh admin biasa dari halaman ini (write-only); "Payout on file" hanya Yes/No.
- [ ] Login sebagai operator uji (lewat undangan). **Harus terjadi:** `/operator` terbuka dengan nama perusahaan tadi.

### 3.3 Partners (`/admin/partners`, `/[id]`)

- [ ] Daftar partner: Handle, Account, Status, Category, Referral name, Payout details, Edit. Partner tanpa handle tampil dengan emailnya.
- [ ] Edit: ubah **Category** dan **Notes**, simpan, kembali ke daftar, nilainya berubah.
- [ ] Partner yang declined dan pending ikut tampil (bukan hanya antrean review).

### 3.4 Creators (`/admin/creators`)

- [ ] **Invites to send**: daftar creator yang dipilih operator tapi belum diundang. Tandai satu **invited**. **Harus terjadi:** hilang dari daftar.
- [ ] **Link account**: hubungkan creator ke akun dengan email uji. Email yang tidak ada → pesan error jelas.
- [ ] **Posts an operator questioned**: kalau ada, tombol putuskan **dibayar / tidak dibayar** menentukan uang. Jangan tekan pada data nyata.

### 3.5 Visits (`/admin/visits`, `/[slug]`)

- [ ] Operator Barbados dikelompokkan per kota.
- [ ] Buka satu operator: ada kode klaim (untuk di-scan), halaman operator, dan email bisnis.
- [ ] **Confirm email**: konfirmasi email bisnis menyimpan dan menampilkan tanda terkonfirmasi.

---

## 4. Admin: konten

### 4.1 Blog (`/admin/blog`)

- [ ] Ringkasan di atas: Live on the site, In draft, Missing keyword or description, Minutes of content owned.
- [ ] **New**: isi Article title, URL slug (otomatis dari judul), Author, Category, Tags, isi artikel, Excerpt.
- [ ] Unggah **Featured image** (dan Alt text). **Harus terjadi:** gambar terunggah dan tampil di pratinjau.
- [ ] Bagian **Search appearance**: Focus keyword, Search title, Meta description, Canonical URL, Structured data, "Hide from search engines". Isi lalu simpan sebagai **draft**.
- [ ] Draft **tidak** boleh muncul di `/blog` publik dan URL-nya menghasilkan 404 untuk orang yang tidak login.
- [ ] Atur **Publish date (UTC)** ke sekarang, terbitkan. **Harus terjadi:** tampil di `/blog` dan `/blog/<slug>`; buka "view source" dan cek `<title>`, meta description, og:image sesuai yang kamu isi.
- [ ] Ubah slug artikel yang sudah terbit. **Harus terjadi:** ada peringatan "Changing a published URL breaks every link to it".
- [ ] **Categories** (`/admin/blog/categories`): buat, ubah urutan (position), hapus. Halaman `/blog/category/<slug>` ikut berubah.
- [ ] Hapus artikel uji. **Harus terjadi:** hilang dari admin dan dari `/blog`.

### 4.2 Prepared pages (`/admin/operator-pages`, `/[slug]`)

- [ ] Filter **Region** dan **State** bekerja dan hitungannya benar.
- [ ] Buka satu halaman: bagian "The operator" dan tiap trip (Title, Summary, Highlights, Duration, Departs, Season, Departs from, Prices, From, Includes, Bring, Good to know, Offer, Booking links, Photos, **Left out**, **Not measured**).
- [ ] Edit satu fakta, simpan: perubahan tercatat. **Check** satu trip: statusnya berubah menjadi checked.
- [ ] **Approve waiting trips** hanya meloloskan trip yang sudah dicek. Halaman publik `/operators/<slug>` hanya menampilkan yang sudah disetujui.
- [ ] Photo approval: foto yang belum disetujui tidak tampil di halaman publik.

### 4.3 Affiliate trips (`/admin/affiliate-trips`)

- [ ] Daftar kosong → ada empty state yang jelas.
- [ ] **Add a trip**: Sold through (FareHarbor/Rezdy), Operator, Booking link, Trip name, Category, Region, Price from, Currency, Photo link, About the trip. Gunakan nama `Tes Affiliate (test)`.
- [ ] Booking link tidak valid → ditolak dengan pesan di field itu.
- [ ] Klik **Test booking link ↗**: terbuka di tab baru.
- [ ] Status LIVE → trip muncul di halaman trip publik (cek `/discover` dan `/explore`).
- [ ] **Take down**: hilang dari halaman publik. **Put back live**: muncul lagi.

---

## 5. Admin: channel, outreach, uang

### 5.1 Rezdy & FareHarbor (`/admin/channels`)

- [ ] Rezdy: status koneksi tiap operator terbaca (sehat/tidak).
- [ ] FareHarbor: unggah laporan uji → **Preview** menampilkan baris yang akan diimpor tanpa menulis apa pun → baru **Import**. File rusak → pesan error, tidak crash.
- [ ] **Run channel sync** mengembalikan hasil (berhasil/ada error) tanpa merusak halaman.

### 5.2 Outreach (`/admin/outreach`)

- [ ] **Set-up** menunjukkan status Instantly (live atau rehearsal). **Catat statusnya sebelum menekan apa pun.**
- [ ] **Waiting for a person**: balasan yang butuh orang; **Mark handled** memindahkannya keluar.
- [ ] **Where everyone is**: hitungan tiap tahap sequence masuk akal.
- [ ] **Next batch**: kalau rehearsal, tekan **Send batch** dan pastikan pesan "nothing was sent". Kalau live, **lewati**.

### 5.3 Payouts & Ledger (`/admin/payouts`)

- [ ] **Kesehatan cron**: tiap cron settlement menunjukkan terakhir jalan kapan dan statusnya.
- [ ] **Ledger**: filter status bekerja; tiap baris punya Kind, Amount, Status, Role, Account, Created. Di HP jadi kartu.
- [ ] **Australia · Rezdy** dan **Indonesia · BluePass**: baris yang menunggu tampil terpisah per region.
- [ ] Permintaan payout partner: **Reveal details** menampilkan data bank hanya setelah tombol ditekan; **Mark paid** meminta referensi; **Decline** meminta alasan. Hanya pada permintaan uji.
- [ ] Komisi: split 20/80 sama untuk semua market (tidak ada pengecualian per region).

---

## 6. CRM (`/crm`)

Ini alat tim BD, terpisah dari konsol admin tetapi login admin yang sama.

- [ ] `/crm` terbuka untuk admin, ditolak untuk non-admin.
- [ ] Daftar **Operator leads**: nama, status (Imported, Contacted, Claim link requested, In discussion, Claim submitted, Manual review, Approved, Live, Declined), sumber (Rezdy / FareHarbor), kategori.
- [ ] **Filter** status, **Source**, **Category**, dan **Search** (nama, telepon). Setelah memfilter, salin URL ke tab baru. **Harus terjadi:** tampilan yang sama persis (filter ada di query string).
- [ ] **Pagination**: halaman 2, kembali ke 1, angka halaman benar; ganti filter mengembalikan ke halaman 1.
- [ ] Buka satu lead: **ubah status** + catatan, simpan. **Harus terjadi:** "Status updated.", status di daftar berubah, riwayat mencatat siapa (email admin) dan kapan.
- [ ] **Tambah catatan** saja: "Note saved.", muncul di riwayat.
- [ ] Status tidak valid / catatan kosong → pesan error, tidak ada perubahan.
- [ ] Nomor telepon berupa link yang bisa diketuk di HP.
- [ ] Di HP (393px): daftar berupa kartu, tidak ada geser samping.
- [ ] Sesi habis (logout di tab lain) lalu simpan di tab ini: pesan "Your admin session has expired", bukan error kosong.

---

## 7. Pengecekan HP untuk semua halaman admin dan CRM (393px)

Buka tiap halaman admin di lebar iPhone (Chrome DevTools → iPhone 16, atau HP asli).

- [ ] Menu hamburger membuka drawer, bisa di-scroll dengan mouse/jari, tutup dengan ✕, Esc, atau tap area gelap.
- [ ] Avatar di kanan atas simetris.
- [ ] Tidak ada geser samping di halaman mana pun.
- [ ] Tile di `/admin` dua kolom, tabel menjadi kartu, label dan petunjuk form bertumpuk rapi.
- [ ] Semua tombol dan link yang diketuk nyaman (sekitar 44px).

---

## 8. Website publik

Lakukan sebagai pengunjung biasa (incognito), lalu sebagai traveller yang login.

**Akun**
- [ ] `/register`: daftar dengan email uji; email verifikasi tiba; link verifikasi bekerja.
- [ ] Email sudah terdaftar → pesan jelas. Password kurang dari 8 karakter → ditolak per field.
- [ ] `/login`: password salah → error jelas; benar → masuk. Logout bekerja.
- [ ] Lupa password: email reset tiba, `/reset-password` mengganti password, link bekas pakai ditolak.
- [ ] `/account`: simpan trip (saved trips) lalu muat ulang; tetap tersimpan.

**Penemuan dan halaman**
- [ ] Beranda, `/discover` (kalau masih terkunci, buka lewat `/preview/<kunci>`), `/explore`, `/conservation`, `/privacy`, `/terms`, `/blog`. Tidak ada halaman kosong, gambar rusak, atau teks placeholder.
- [ ] `/operators/<slug>` dan halaman trip operator: hanya konten yang sudah disetujui.
- [ ] Tidak ada trip uji (QA, UX Flow Test) yang terlihat pengunjung biasa.

**Booking**
- [ ] `/book/<slug>`: pilih tanggal (hanya tanggal yang tersedia), tamu, isi nama, telepon dengan kode negara, email. Tombol Book dengan data kurang → pesan **per field**, bukan diam.
- [ ] Minimum tamu per kapal dihitung dari **semua** penumpang, bukan per booking.
- [ ] Bayar dengan kartu uji. **Harus terjadi:** halaman `/book/<slug>/confirmed`, email konfirmasi, dan booking muncul di dashboard operator serta di Traction (`?test=1`).
- [ ] Kapasitas turun sesuai jumlah tamu; kursi terakhir tidak bisa dijual dua kali.
- [ ] `/embed/book/<slug>` tampil dan berfungsi di dalam iframe.
- [ ] Header booking mengikuti foto cover trip.

**Kai (chat)**
- [ ] Widget muncul, jawab pertanyaan alami, tiap pertanyaan Kai punya input yang pasti (tanggal, jumlah, dsb.).
- [ ] Tanya trip yang tidak ada → jawaban sopan, tidak mengarang.
- [ ] Kirim inquiry → muncul di sisi operator/tim.

**Waitlist dan partner**
- [ ] Formulir waitlist (traveller / operator / partner) dengan email `@ops.bluepass.co`; hitungan "On the waitlist" di Traction naik 1 (dengan `?test=1`).
- [ ] `/partners/apply` → muncul di Approvals. `/partner` dan `/partner-portal` untuk partner yang sudah disetujui: link referral, Copy, Add another link.
- [ ] Link `?ref=<kode>` mencatat klik (angka "clicks" di portal partner bertambah).
- [ ] `/creator`: alur creator bisa dibuka dan dipahami.

**Kesehatan**
- [ ] `/api/health` mengembalikan ok.
- [ ] Buka tiap halaman di atas di 393px: tidak ada geser samping.

---

## 9. Bersih-bersih setelah tes

- [ ] Blog uji: hapus. Trip affiliate uji: **Take down**. Operator/partner uji: biarkan, nama `(test)` dan email `@ops.bluepass.co` membuat Traction mengabaikannya.
- [ ] Booking uji: batalkan lewat dashboard operator supaya kursi kembali.
- [ ] Akun dummy: `node --env-file=.env scripts/dummy-operator.mjs remove` (dan skrip partner yang sejalan) bila sudah tidak dipakai.
- [ ] Cek `/admin` (tanpa `?test=1`) kembali menunjukkan angka asli.

---

## Hasil

Tulis di sini temuanmu: `Bagian.nomor - halaman - apa yang terjadi`.

-
