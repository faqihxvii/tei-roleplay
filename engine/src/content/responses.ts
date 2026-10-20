import type { DelayedEffect, Effects, Role, Tag } from '../types';
import { RESPONSES_2026_10 } from './packs/2026-10';

// Mode Pemula: instead of a hand of policy cards plus levers, each crisis offers every team three
// responses written for that crisis, each with its effects printed on it. One tap, and the link
// between the crisis and the choice is the choice itself. policies.ts turns these into cards
// (ids `rsp_<crisis><Role><A|B|C>`), so validation, resolution, the reveal and kesepakatan reuse
// the card pipeline unchanged.
//
// Writing rules: every option answers this crisis; every option has a benefit and a cost; the three
// options per team lean populis / jangka panjang / untung sendiri; satire punches up at fictional
// institutions, never real people or brands.

export interface ResponseDraft {
  name: string;
  description: string;
  effects: Effects;
  delayed?: DelayedEffect[];
  tags?: Tag[];
}

export type ResponseSet = Record<Role, [ResponseDraft, ResponseDraft, ResponseDraft]>;

export const RESPONSES: Record<string, ResponseSet> = {
  beras: {
    pemerintah: [
      { name: 'Subsidi Beras Lewat Aplikasi', description: 'Harga beras turun, asal sinyal kuat dan kuota belum habis duluan.', effects: { harga: -1, keresahan: -1, kas: -2 }, tags: ['belanja', 'subsidi'] },
      { name: 'Bangun Irigasi Sawah', description: 'Mahal dan lama, tapi kemarau depan sawah tidak lagi menangis.', effects: { kas: -2 }, delayed: [{ inYears: 1, effects: { harga: -1, kerja: 1 } }], tags: ['belanja', 'infrastruktur'] },
      { name: 'Imbau Warga Makan Ubi', description: 'Gratis untuk kas, mahal untuk perasaan warga.', effects: { kas: 1, kepercayaan: -2 } },
    ],
    bankSentral: [
      { name: 'Tahan Uang Beredar', description: 'Harga diredam, kredit usaha ikut seret.', effects: { harga: -1, kerja: -1, kredibilitas: 1 } },
      { name: 'Data Inflasi Tiap Pekan', description: 'Pasar tenang karena tahu angkanya, meski beras tetap mahal.', effects: { keresahan: -1, kredibilitas: 1, modal: -1 } },
      { name: 'Bilang Inflasi Itu Sementara', description: 'Konferensi pers megah. Tidak ada yang percaya.', effects: { kepercayaan: -1, kredibilitas: -1, kerja: 1 } },
    ],
    pengusaha: [
      { name: 'Jual Beras Murah Kemasan Kecil', description: 'Laku keras, untung tipis, warga senang.', effects: { harga: -1, modal: -1, kepercayaan: 1 } },
      { name: 'Investasi Penggilingan Modern', description: 'Modal keluar sekarang, beras lebih murah tahun depan.', effects: { modal: -2 }, delayed: [{ inYears: 1, effects: { harga: -1, kerja: 1, modal: 3 } }], tags: ['investasi'] },
      { name: 'Timbun Stok Tunggu Mahal', description: 'Gudang penuh, harga naik, nurani kosong.', effects: { modal: 3, harga: 1, kepercayaan: -1 } },
    ],
    buruh: [
      { name: 'Tuntut Tunjangan Beras', description: 'Dapur buruh selamat, pengusaha mengeluh biaya.', effects: { solidaritas: 1, kepercayaan: 1, harga: 1 }, tags: ['upah'] },
      { name: 'Koperasi Pangan Buruh', description: 'Beli beras bersama, lebih murah, butuh waktu menata.', effects: { solidaritas: 1, keresahan: -1, kerja: -1 }, tags: ['dialog'] },
      { name: 'Demo di Depan Gudang Beras', description: 'Viral sehari, gudang tetap tutup.', effects: { solidaritas: 2, keresahan: 1 } },
    ],
    masyarakat: [
      { name: 'Pindah Belanja ke Pasar Tani', description: 'Langsung dari petani, lebih murah tapi jauh.', effects: { harga: -1, tabungan: 1, kerja: -1 } },
      { name: 'Laporkan Penimbun ke Warganet', description: 'Gudang gelap terbongkar, pemiliknya pura-pura kaget.', effects: { kepercayaan: 1, keresahan: 1 }, tags: ['investigasi'] },
      { name: 'Borong Beras Lima Karung', description: 'Rumah aman, tetangga kehabisan, harga makin naik.', effects: { tabungan: -2, harga: 1, kerja: 1 } },
    ],
  },
  pupuk: {
    pemerintah: [
      { name: 'Bagikan Pupuk Gratis Pakai KTP', description: 'Petani lega, antrean mengular, kas menipis.', effects: { kepercayaan: 1, harga: -1, kas: -2 }, tags: ['belanja', 'subsidi'] },
      { name: 'Gudang Pupuk di Tiap Kecamatan', description: 'Jalur distribusi pendek, calo kehilangan lapak tahun depan.', effects: { kas: -2 }, delayed: [{ inYears: 1, effects: { harga: -1, kepercayaan: 1 } }], tags: ['belanja', 'infrastruktur'] },
      { name: 'Bentuk Tim Investigasi Internal', description: 'Timnya rapat di hotel. Hasilnya: rapat lagi.', effects: { kas: 1, kepercayaan: -1, keresahan: 1 } },
    ],
    bankSentral: [
      { name: 'Kredit Murah untuk Petani', description: 'Petani bisa beli pupuk swasta, uang beredar bertambah.', effects: { kerja: 1, harga: 1 } },
      { name: 'Pantau Harga Pangan Harian', description: 'Tidak menurunkan harga, tapi semua tahu masalahnya di mana.', effects: { keresahan: -1, kredibilitas: 1, modal: -1 } },
      { name: 'Diam, Ini Bukan Urusan Moneter', description: 'Secara teknis benar. Secara sosial, dingin.', effects: { kredibilitas: 1, kepercayaan: -1 } },
    ],
    pengusaha: [
      { name: 'Jual Pupuk Non-Subsidi Murah', description: 'Petani terbantu, margin perusahaan menyusut.', effects: { harga: -1, modal: -1, kerja: 1 } },
      { name: 'Investasi Pabrik Pupuk Organik', description: 'Pupuk dari kotoran ternak, untung dari kesabaran.', effects: { modal: -2 }, delayed: [{ inYears: 1, effects: { kerja: 1, modal: 3 } }], tags: ['investasi'] },
      { name: 'Lobi Kuota Distribusi', description: 'Amplop tebal agar kuota pupuk lewat gudang sendiri.', effects: { modal: -1, kepercayaan: -1 }, tags: ['lobi'] },
    ],
    buruh: [
      { name: 'Tuntut Upah Buruh Tani Naik', description: 'Buruh tani bertahan, harga panen ikut naik.', effects: { solidaritas: 1, kepercayaan: 1, harga: 1 }, tags: ['upah'] },
      { name: 'Dialog Tiga Pihak Soal Pupuk', description: 'Duduk bareng petani, pabrik, dan pemerintah. Lambat tapi adem.', effects: { keresahan: -1, solidaritas: 1, kerja: -1 }, tags: ['dialog'] },
      { name: 'Ikut Mogok Tanam', description: 'Suara keras terdengar, sawah kosong lebih lama.', effects: { solidaritas: 2, kerja: -1, keresahan: 1 } },
    ],
    masyarakat: [
      { name: 'Beli Langsung dari Petani', description: 'Petani dapat harga layak, pembeli bayar sedikit lebih.', effects: { kerja: 1, tabungan: -1, kepercayaan: 1 } },
      { name: 'Lacak Karung Bercap Subsidi', description: 'Foto karung di pasar gelap jadi bukti, pejabat gerah.', effects: { kepercayaan: 1, keresahan: 1 }, tags: ['investigasi'] },
      { name: 'Tanam Cabai di Pot Sendiri', description: 'Hemat belanja, petani kehilangan satu pembeli.', effects: { tabungan: 1, kerja: -1 } },
    ],
  },
  minyak: {
    pemerintah: [
      { name: 'Tahan Harga Bensin Mati-matian', description: 'Harga tenang, kas negara jadi ember bocor.', effects: { harga: -1, keresahan: -1, kas: -2 }, tags: ['belanja', 'subsidi'] },
      { name: 'Bangun Transportasi Umum', description: 'Bus listrik dan rel baru, warga tidak bergantung bensin tahun depan.', effects: { kas: -2 }, delayed: [{ inYears: 1, effects: { kerja: 1, harga: -1 } }], tags: ['belanja', 'infrastruktur'] },
      { name: 'Naikkan Harga BBM Tengah Malam', description: 'Kas selamat, warga bangun dengan kejutan.', effects: { kas: 2, harga: 1, kepercayaan: -1 } },
    ],
    bankSentral: [
      { name: 'Naikkan Bunga Redam Inflasi', description: 'Harga diredam, cicilan motor warga ikut naik.', effects: { harga: -1, kerja: -1, kredibilitas: 1 } },
      { name: 'Jelaskan Arah Kebijakan Terbuka', description: 'Pasar paham rencananya, kepanikan reda.', effects: { keresahan: -1, kredibilitas: 1, modal: -1 } },
      { name: 'Longgarkan Kredit Biar Ramai', description: 'Ekonomi hangat sebentar, inflasi menyusul tahun depan.', effects: { kerja: 1 }, delayed: [{ inYears: 1, effects: { harga: 1 } }] },
    ],
    pengusaha: [
      { name: 'Serap Kenaikan Ongkos Kirim', description: 'Harga barang tetap, keuntungan dikorbankan.', effects: { harga: -1, modal: -2, kepercayaan: 1 } },
      { name: 'Investasi Armada Listrik', description: 'Mahal sekarang, ongkos bensin hilang tahun depan.', effects: { modal: -2 }, delayed: [{ inYears: 1, effects: { kerja: 1, modal: 3 } }], tags: ['investasi'] },
      { name: 'Naikkan Harga, Salahkan Minyak', description: 'Minyak naik sedikit, harga naik banyak.', effects: { modal: 3, harga: 1, kepercayaan: -1 } },
    ],
    buruh: [
      { name: 'Tuntut Tunjangan Transport', description: 'Ongkos ke pabrik tertutup, pengusaha menghitung ulang.', effects: { solidaritas: 1, kepercayaan: 1, harga: 1 }, tags: ['upah'] },
      { name: 'Usul Kerja dari Rumah Sebagian', description: 'Hemat bensin, produktivitas belum tentu.', effects: { keresahan: -1, kerja: -1, solidaritas: 1 }, tags: ['dialog'] },
      { name: 'Konvoi Motor Tolak Harga BBM', description: 'Jalanan macet, pesan sampai, bensin terbakar sia-sia.', effects: { solidaritas: 2, keresahan: 1 } },
    ],
    masyarakat: [
      { name: 'Naik Angkot Bareng Tetangga', description: 'Bensin hemat, waktu tempuh bertambah.', effects: { tabungan: 1, harga: -1, kerja: -1 } },
      { name: 'Awasi SPBU Nakal', description: 'Takaran curang terbongkar, antrean protes memanjang.', effects: { kepercayaan: 1, keresahan: 1 }, tags: ['investigasi'] },
      { name: 'Isi Penuh Jeriken Sebelum Naik', description: 'Rumah jadi gudang bensin, stok SPBU kosong.', effects: { tabungan: -1, harga: 1, kerja: 1 } },
    ],
  },
  listrik: {
    pemerintah: [
      { name: 'Genset Gratis untuk UMKM', description: 'Usaha kecil tetap menyala, kas ikut terbakar solar.', effects: { kerja: 1, keresahan: -1, kas: -2 }, tags: ['belanja', 'bansos'] },
      { name: 'Bangun Pembangkit Baru', description: 'Mahal dan lama, tapi tidak ada lagi jadwal gelap.', effects: { kas: -2 }, delayed: [{ inYears: 1, effects: { kerja: 2 } }], tags: ['belanja', 'infrastruktur'] },
      { name: 'Imbau Warga Bijak Pakai Listrik', description: 'Diumumkan dari ruangan ber-AC 16 derajat.', effects: { kas: 1, kepercayaan: -1, keresahan: 1 } },
    ],
    bankSentral: [
      { name: 'Kredit Hijau untuk Panel Surya', description: 'Atap rumah jadi pembangkit kecil, inflasi kecil menyusul.', effects: { kerja: 1 }, delayed: [{ inYears: 1, effects: { harga: 1 } }] },
      { name: 'Jaga Harga Tetap Tenang', description: 'Fokus inflasi saat pabrik lain sibuk mencari genset.', effects: { harga: -1, kredibilitas: 1, kerja: -1 } },
      { name: 'Beri Pernyataan Optimistis', description: 'Lampu mati, kata-katanya tetap terang.', effects: { kredibilitas: -1, keresahan: -1 } },
    ],
    pengusaha: [
      { name: 'Sewa Genset, Pabrik Jalan Terus', description: 'Pekerja aman, ongkos solar memakan untung.', effects: { kerja: 1, modal: -2 } },
      { name: 'Investasi Atap Surya Pabrik', description: 'Panel dipasang sekarang, tagihan listrik hilang tahun depan.', effects: { modal: -2 }, delayed: [{ inYears: 1, effects: { kerja: 1, modal: 3 } }], tags: ['investasi'] },
      { name: 'Hentikan Sif Malam Tanpa Gaji', description: 'Ongkos turun, buruh pulang dengan tangan kosong.', effects: { modal: 2, kerja: -1, keresahan: 1 } },
    ],
    buruh: [
      { name: 'Tuntut Gaji Tetap Saat Padam', description: 'Buruh tidak menanggung gelap, pengusaha menanggung biaya.', effects: { solidaritas: 1, kepercayaan: 1, kerja: -1 }, tags: ['upah'] },
      { name: 'Atur Ulang Jadwal Sif Bersama', description: 'Kerja pindah ke jam listrik menyala, semua capek tapi jalan.', effects: { kerja: 1, solidaritas: -1 }, tags: ['dialog'] },
      { name: 'Ancam Mogok Kalau Padam Lagi', description: 'Ancaman terdengar keras, pembangkit tetap rusak.', effects: { solidaritas: 2, keresahan: 1 } },
    ],
    masyarakat: [
      { name: 'Ronda Lilin Satu Kampung', description: 'Warga saling jaga dalam gelap, warung lilin laris.', effects: { keresahan: -1, kerja: 1, tabungan: -1 } },
      { name: 'Bongkar Perawatan Fiktif', description: 'Ternyata pembangkit tidak dirawat lima tahun. Warga marah.', effects: { kepercayaan: 1, keresahan: 1 }, tags: ['investigasi'] },
      { name: 'Beli Genset Pribadi', description: 'Rumah sendiri terang, tabungan dan tetangga gelap.', effects: { tabungan: -2, kerja: 1, harga: 1 } },
    ],
  },
  asuransi: {
    pemerintah: [
      { name: 'Talangi Klaim Nasabah', description: 'Nasabah selamat, kas negara jadi asuransi bagi asuransi.', effects: { kepercayaan: 1, keresahan: -1, kas: -2 }, tags: ['belanja', 'bansos'] },
      { name: 'Bentuk Lembaga Penjamin Polis', description: 'Aturan baru, gagal bayar berikutnya tidak menyeret nasabah.', effects: { kas: -1 }, delayed: [{ inYears: 1, effects: { kepercayaan: 2 } }], tags: ['belanja'] },
      { name: 'Serahkan ke Mekanisme Pasar', description: 'Pemerintah hemat, nasabah belajar mekanisme menangis.', effects: { kas: 1, kepercayaan: -2 } },
    ],
    bankSentral: [
      { name: 'Suntik Dana ke Lembaga Keuangan', description: 'Bank lain tidak ikut tumbang, uang beredar membengkak.', effects: { keresahan: -1, kredibilitas: -1 }, delayed: [{ inYears: 1, effects: { harga: 1 } }] },
      { name: 'Perketat Pengawasan Investasi', description: 'Dana nasabah tidak boleh lagi dijudikan di saham gorengan.', effects: { kredibilitas: 1, kepercayaan: 1, kerja: -1 }, tags: ['edukasi'] },
      { name: 'Bilang Sistem Keuangan Kuat', description: 'Diulang tiap jam. Antrean di kantor asuransi tetap panjang.', effects: { kredibilitas: -1, keresahan: -1 } },
    ],
    pengusaha: [
      { name: 'Ganti Asuransi Karyawan Sendiri', description: 'Karyawan tetap terlindungi, perusahaan menanggung biaya.', effects: { kepercayaan: 1, modal: -2, keresahan: -1 } },
      { name: 'Investasi di Usaha Riil', description: 'Uang pindah dari saham ke pabrik, pekerjaan tumbuh tahun depan.', effects: { modal: -2 }, delayed: [{ inYears: 1, effects: { kerja: 1, modal: 3 } }], tags: ['investasi'] },
      { name: 'Borong Aset Asuransi Murah', description: 'Gedung kantor dijual murah, siapa cepat dia kaya.', effects: { modal: 3, kepercayaan: -1, keresahan: 1 } },
    ],
    buruh: [
      { name: 'Tuntut Dana Pensiun Dijamin', description: 'Pensiunan bisa tidur, pengusaha makin hati-hati merekrut.', effects: { solidaritas: 1, kepercayaan: 1, kerja: -1 }, tags: ['upah'] },
      { name: 'Edukasi Investasi untuk Anggota', description: 'Anggota tidak lagi percaya janji untung 20 persen.', effects: { solidaritas: 1, keresahan: -1, kerja: -1 }, tags: ['edukasi'] },
      { name: 'Geruduk Kantor Asuransi', description: 'Kantor dikepung, uangnya tetap tidak ada di brankas.', effects: { solidaritas: 2, keresahan: 1 } },
    ],
    masyarakat: [
      { name: 'Pindahkan Uang ke Bank', description: 'Lebih aman, bunganya kecil, hatinya tenang.', effects: { tabungan: 1, kepercayaan: 1, kerja: -1 } },
      { name: 'Telusuri Ke Mana Premi Pergi', description: 'Jejak uang mengarah ke saham milik kerabat direksi.', effects: { kepercayaan: 1, keresahan: 1 }, tags: ['investigasi'] },
      { name: 'Tarik Semua Tabungan Sekarang', description: 'Uang di bawah kasur aman, bank-bank lain ikut panik.', effects: { tabungan: 1, kepercayaan: -1, keresahan: 1 } },
    ],
  },
  pinjol: {
    pemerintah: [
      { name: 'Bantuan Tunai Pelunasan Utang', description: 'Korban lega, penagih senang, kas menangis.', effects: { keresahan: -1, kepercayaan: 1, kas: -2 }, tags: ['belanja', 'bansos'] },
      { name: 'Blokir Aplikasi Ilegal Massal', description: 'Seribu aplikasi diblokir, dua ribu lahir besok.', effects: { kepercayaan: 1, kas: -1 }, delayed: [{ inYears: 1, effects: { keresahan: -1 } }], tags: ['belanja'] },
      { name: 'Imbau Warga Jangan Utang', description: 'Disampaikan lewat baliho yang dibiayai utang negara.', effects: { kas: 1, kepercayaan: -1, keresahan: 1 } },
    ],
    bankSentral: [
      { name: 'Kampanye Literasi Pinjaman', description: 'Warga belajar membaca bunga, bukan cuma angka cair.', effects: { keresahan: -1, kredibilitas: 1, modal: -1 }, tags: ['edukasi'] },
      { name: 'Kredit Mikro Resmi Bunga Rendah', description: 'Ada pilihan legal, uang beredar ikut bertambah.', effects: { kerja: 1, keresahan: -1 }, delayed: [{ inYears: 1, effects: { harga: 1 } }] },
      { name: 'Laporan Tahunan Setebal Bantal', description: 'Isinya lengkap, tidak ada yang membaca.', effects: { kredibilitas: 1, kepercayaan: -1 } },
    ],
    pengusaha: [
      { name: 'Pinjaman Darurat untuk Karyawan', description: 'Karyawan tidak lari ke pinjol, kas perusahaan tertahan.', effects: { keresahan: -1, modal: -2, kepercayaan: 1 } },
      { name: 'Investasi Fintech Legal', description: 'Pinjaman resmi yang jujur, untung datang tahun depan.', effects: { modal: -2 }, delayed: [{ inYears: 1, effects: { kerja: 1, modal: 3 } }], tags: ['investasi'] },
      { name: 'Pasang Iklan Pinjol di Gerai', description: 'Uang iklan masuk, pelanggan terjerat.', effects: { modal: 3, keresahan: 1, kepercayaan: -1 } },
    ],
    buruh: [
      { name: 'Tuntut Upah Cukup Tanpa Utang', description: 'Gaji naik agar buruh tidak perlu pinjol, harga ikut naik.', effects: { solidaritas: 1, kepercayaan: 1, harga: 1 }, tags: ['upah'] },
      { name: 'Kelas Keuangan di Serikat', description: 'Anggota belajar membuat anggaran, rapat jadi lebih panjang.', effects: { keresahan: -1, solidaritas: 1, kerja: -1 }, tags: ['edukasi'] },
      { name: 'Hadang Penagih di Gerbang Pabrik', description: 'Penagih kabur hari ini, utangnya tetap ada.', effects: { solidaritas: 2, keresahan: 1 } },
    ],
    masyarakat: [
      { name: 'Arisan Darurat RT', description: 'Pinjam ke tetangga tanpa bunga, dengan bonus gosip.', effects: { keresahan: -1, tabungan: -1, kepercayaan: 1 } },
      { name: 'Laporkan Pinjol ke Polisi Siber', description: 'Satu jaringan penagih tertangkap, sisanya ganti nama.', effects: { kepercayaan: 1, keresahan: 1 }, tags: ['investigasi'] },
      { name: 'Gali Lubang Tutup Lubang', description: 'Pinjol A dilunasi dengan pinjol B. Hari ini selamat.', effects: { tabungan: 1, keresahan: 1, kerja: 1 } },
    ],
  },
  phk: {
    pemerintah: [
      { name: 'Pesangon Talangan Negara', description: 'Korban PHK bertahan, kas negara ikut di-PHK.', effects: { keresahan: -1, kepercayaan: 1, kas: -2 }, tags: ['belanja', 'bansos'] },
      { name: 'Balai Latihan Kerja Baru', description: 'Penjahit belajar coding, hasilnya terasa tahun depan.', effects: { kas: -2 }, delayed: [{ inYears: 1, effects: { kerja: 2 } }], tags: ['belanja', 'infrastruktur'] },
      { name: 'Bilang Itu Restrukturisasi', description: 'Kata yang lebih sopan untuk pabrik tutup.', effects: { kas: 1, kepercayaan: -1, keresahan: 1 } },
    ],
    bankSentral: [
      { name: 'Turunkan Bunga Kredit Usaha', description: 'Pabrik bisa bernapas, harga naik pelan-pelan.', effects: { kerja: 1 }, delayed: [{ inYears: 1, effects: { harga: 1 } }] },
      { name: 'Jaga Rupiah dari Kain Impor', description: 'Impor lebih mahal, pabrik lokal sedikit terbantu.', effects: { kerja: 1, harga: 1, kredibilitas: 1 }, tags: ['rupiah'] },
      { name: 'Fokus Inflasi Saja', description: 'Harga stabil, pengangguran tidak masuk mandat.', effects: { harga: -1, kerja: -1, kredibilitas: 1 } },
    ],
    pengusaha: [
      { name: 'Kurangi Jam Kerja, Bukan Orang', description: 'Semua kerja lebih sedikit, tidak ada yang dipecat.', effects: { kerja: 1, modal: -2, kepercayaan: 1 } },
      { name: 'Investasi Lini Produk Baru', description: 'Ganti kain murah dengan pakaian olahraga, untung tahun depan.', effects: { modal: -2 }, delayed: [{ inYears: 1, effects: { kerja: 2, modal: 3 } }], tags: ['investasi'] },
      { name: 'Pindah Pabrik ke Luar Negeri', description: 'Upah lebih murah di sana, pengangguran lebih banyak di sini.', effects: { modal: 3, kerja: -1, keresahan: 1 }, tags: ['phk'] },
    ],
    buruh: [
      { name: 'Tuntut Pesangon Penuh', description: 'Hak buruh dibayar, pabrik makin enggan merekrut.', effects: { solidaritas: 1, kepercayaan: 1, kerja: -1 }, tags: ['upah'] },
      { name: 'Runding Kerja Bergilir', description: 'Pekerjaan dibagi rata, gaji dibagi rata juga.', effects: { kerja: 1, solidaritas: -1, keresahan: -1 }, tags: ['dialog'] },
      { name: 'Duduki Pabrik yang Mau Tutup', description: 'Mesin berhenti, berita jalan, pabrik tetap tutup.', effects: { solidaritas: 2, keresahan: 1 } },
    ],
    masyarakat: [
      { name: 'Beli Produk Tekstil Lokal', description: 'Sedikit lebih mahal, pabrik dalam negeri tetap hidup.', effects: { kerja: 1, tabungan: -1 } },
      { name: 'Ungkap Impor Kain Ilegal', description: 'Kontainer kain selundupan disita di pelabuhan.', effects: { kepercayaan: 1, kerja: 1, keresahan: 1 }, tags: ['investigasi'] },
      { name: 'Buru Diskon Kain Impor', description: 'Baju murah, pabrik tetangga makin sepi.', effects: { tabungan: 1, harga: -1, kerja: -1 } },
    ],
  },
  ojol: {
    pemerintah: [
      { name: 'Subsidi Tarif untuk Pengemudi', description: 'Tarif naik tanpa penumpang protes, kas yang membayar.', effects: { keresahan: -1, kerja: 1, kas: -2 }, tags: ['belanja', 'subsidi'] },
      { name: 'Aturan Status Mitra yang Jelas', description: 'Pengemudi dapat jaminan sosial, aplikator mengeluh tahun depan.', effects: { kas: -1, kepercayaan: 1 }, delayed: [{ inYears: 1, effects: { keresahan: -1 } }] },
      { name: 'Undang Aplikator Makan Malam', description: 'Pengemudi menunggu di luar restoran.', effects: { kas: 1, kepercayaan: -1, keresahan: 1 } },
    ],
    bankSentral: [
      { name: 'Kredit Motor Listrik Murah', description: 'Pengemudi hemat bensin, cicilan tetap jalan.', effects: { kerja: 1 }, delayed: [{ inYears: 1, effects: { harga: 1 } }] },
      { name: 'Kampanye Keuangan Pengemudi', description: 'Belajar memisahkan uang bensin dan uang rumah.', effects: { keresahan: -1, kredibilitas: 1, modal: -1 }, tags: ['edukasi'] },
      { name: 'Anggap Ini Isu Ketenagakerjaan', description: 'Benar secara mandat, dingin di mata jalanan.', effects: { kredibilitas: 1, kepercayaan: -1 } },
    ],
    pengusaha: [
      { name: 'Turunkan Potongan Aplikasi', description: 'Pengemudi senang, laporan laba kuartalan murung.', effects: { keresahan: -1, modal: -2, kerja: 1 } },
      { name: 'Investasi Asuransi Pengemudi', description: 'Pengemudi loyal, armada stabil tahun depan.', effects: { modal: -2 }, delayed: [{ inYears: 1, effects: { kerja: 1, modal: 3 } }], tags: ['investasi'] },
      { name: 'Lobi Aturan Tarif Bebas', description: 'Amplop untuk aturan yang membebaskan potongan.', effects: { modal: -1, kepercayaan: -1 }, tags: ['lobi'] },
    ],
    buruh: [
      { name: 'Tuntut Tarif Minimum per Km', description: 'Pengemudi dapat upah layak, ongkos penumpang naik.', effects: { solidaritas: 1, kepercayaan: 1, harga: 1 }, tags: ['upah'] },
      { name: 'Runding dengan Aplikator', description: 'Kompromi pelan-pelan, demo ditunda dulu.', effects: { keresahan: -1, solidaritas: 1, kerja: -1 }, tags: ['dialog'] },
      { name: 'Matikan Aplikasi Seminggu', description: 'Kota lumpuh, pengemudi juga tidak makan.', effects: { solidaritas: 2, kerja: -1, keresahan: 1 } },
    ],
    masyarakat: [
      { name: 'Kasih Tip Lebih ke Pengemudi', description: 'Pengemudi tersenyum, dompet penumpang sedikit menipis.', effects: { keresahan: -1, tabungan: -1, kepercayaan: 1 } },
      { name: 'Bongkar Potongan Tersembunyi', description: 'Struk dibandingkan, potongan ternyata 40 persen.', effects: { kepercayaan: 1, keresahan: 1 }, tags: ['investigasi'] },
      { name: 'Jalan Kaki Saja Selama Mogok', description: 'Sehat dan hemat, pengemudi makin sepi order.', effects: { tabungan: 1, kerja: -1 } },
    ],
  },
  data: {
    pemerintah: [
      { name: 'Ganti Rugi Korban Kebocoran', description: 'Warga dapat kompensasi kecil, kas dapat lubang besar.', effects: { kepercayaan: 1, keresahan: -1, kas: -2 }, tags: ['belanja', 'bansos'] },
      { name: 'Bangun Pusat Data Aman', description: 'Server baru dengan kunci asli, bukan kata sandi admin123.', effects: { kas: -2 }, delayed: [{ inYears: 1, effects: { kepercayaan: 2 } }], tags: ['belanja', 'infrastruktur'] },
      { name: 'Salahkan Peretas Asing', description: 'Peretasnya ternyata akun anak magang.', effects: { kas: 1, kepercayaan: -1, keresahan: 1 } },
    ],
    bankSentral: [
      { name: 'Wajibkan Bank Verifikasi Ulang', description: 'Penipuan pakai data bocor dihadang, antrean bank memanjang.', effects: { keresahan: -1, kerja: -1, kredibilitas: 1 } },
      { name: 'Edukasi Waspada Penipuan', description: 'Warga belajar tidak mengirim kode OTP ke siapa pun.', effects: { keresahan: -1, kredibilitas: 1, modal: -1 }, tags: ['edukasi'] },
      { name: 'Bilang Data Bank Aman Kok', description: 'Kalimat itu diucapkan tepat sebelum data bank bocor.', effects: { kredibilitas: -1, kepercayaan: -1, kerja: 1 } },
    ],
    pengusaha: [
      { name: 'Tanggung Biaya Kartu Baru', description: 'Pelanggan aman, biaya keamanan memakan laba.', effects: { kepercayaan: 1, modal: -2, keresahan: -1 } },
      { name: 'Investasi Keamanan Siber', description: 'Insinyur keamanan direkrut, bisnis tumbuh tahun depan.', effects: { modal: -2 }, delayed: [{ inYears: 1, effects: { kerja: 1, modal: 3 } }], tags: ['investasi'] },
      { name: 'Beli Data Bocor untuk Iklan', description: 'Iklan tepat sasaran, etika meleset jauh.', effects: { modal: 3, kepercayaan: -1, keresahan: 1 } },
    ],
    buruh: [
      { name: 'Tuntut Tunjangan Risiko Digital', description: 'Pekerja data dihargai, pengusaha menghitung ulang biaya.', effects: { solidaritas: 1, kepercayaan: 1, harga: 1 }, tags: ['upah'] },
      { name: 'Latihan Keamanan Data Anggota', description: 'Anggota tidak lagi pakai tanggal lahir sebagai kata sandi.', effects: { keresahan: -1, solidaritas: 1, kerja: -1 }, tags: ['edukasi'] },
      { name: 'Demo Tuntut Menteri Mundur', description: 'Spanduk besar, menterinya cuti ke luar negeri.', effects: { solidaritas: 2, keresahan: 1 } },
    ],
    masyarakat: [
      { name: 'Ganti Semua Kata Sandi', description: 'Akun lebih aman, setengah warga lupa kata sandi baru.', effects: { keresahan: -1, kerja: -1, kepercayaan: 1 } },
      { name: 'Telusuri Siapa Penjual Data', description: 'Jejak penjual mengarah ke vendor milik pejabat.', effects: { kepercayaan: 1, keresahan: 1 }, tags: ['investigasi'] },
      { name: 'Jual Data Diri Sendiri Duluan', description: 'Kalau toh bocor, mending dapat uang. Logika yang mengerikan.', effects: { tabungan: 2, kepercayaan: -1, keresahan: 1 } },
    ],
  },
  judol: {
    pemerintah: [
      { name: 'Bansos Khusus Keluarga Korban', description: 'Dapur korban judi ngebul, asal tidak ikut dipakai main.', effects: { keresahan: -1, kepercayaan: 1, kas: -2 }, tags: ['belanja', 'bansos'] },
      { name: 'Pusat Rehabilitasi Kecanduan', description: 'Bangunan dan konselor baru, korban pulih tahun depan.', effects: { kas: -2 }, delayed: [{ inYears: 1, effects: { keresahan: -1, kerja: 1 } }], tags: ['belanja', 'infrastruktur'] },
      { name: 'Pajaki Bandar Diam-diam', description: 'Kas bertambah, moral berkurang.', effects: { kas: 2, kepercayaan: -2 } },
    ],
    bankSentral: [
      { name: 'Blokir Rekening Penampung Judi', description: 'Aliran uang bandar tersendat, bank sibuk memverifikasi.', effects: { keresahan: -1, kredibilitas: 1, kerja: -1 } },
      { name: 'Edukasi Peluang dan Risiko', description: 'Warga belajar bahwa bandar selalu menang. Matematika menyelamatkan.', effects: { keresahan: -1, kredibilitas: 1, modal: -1 }, tags: ['edukasi'] },
      { name: 'Pura-pura Tidak Lihat Transfer', description: 'Transaksi ramai, angka ekonomi tampak sehat.', effects: { kerja: 1, kredibilitas: -1, keresahan: 1 } },
    ],
    pengusaha: [
      { name: 'Tolak Iklan Judi di Gerai', description: 'Toko bersih dari iklan judi, pemasukan iklan hilang.', effects: { kepercayaan: 1, modal: -1, keresahan: -1 } },
      { name: 'Investasi Gim Edukasi', description: 'Gim tanpa judi, untung datang setelah pemain bosan kalah.', effects: { modal: -2 }, delayed: [{ inYears: 1, effects: { kerja: 1, modal: 3 } }], tags: ['investasi'] },
      { name: 'Lobi Aturan Iklan Longgar', description: 'Amplop agar iklan judi tetap boleh tampil.', effects: { modal: -1, keresahan: 1 }, tags: ['lobi'] },
    ],
    buruh: [
      { name: 'Tuntut Gaji Dibayar Mingguan', description: 'Uang tidak habis semalam, pengusaha repot menghitung.', effects: { solidaritas: 1, keresahan: -1, kerja: -1 }, tags: ['upah'] },
      { name: 'Kelompok Pendamping Sesama Buruh', description: 'Teman sekerja saling menjaga dari aplikasi judi.', effects: { keresahan: -1, solidaritas: 1, kerja: -1 }, tags: ['dialog'] },
      { name: 'Pinjam Kas Serikat untuk Korban', description: 'Korban tertolong, kas serikat kosong.', effects: { keresahan: -1, solidaritas: -1, kepercayaan: 1 } },
    ],
    masyarakat: [
      { name: 'Hapus Aplikasi Judi Satu Kampung', description: 'Ponsel bersih, warung kehilangan pelanggan isi saldo.', effects: { keresahan: -1, tabungan: 1, kerja: -1 } },
      { name: 'Bongkar Jaringan Promotor Judi', description: 'Akun promosi ternyata dikelola orang terkenal setempat.', effects: { kepercayaan: 1, keresahan: 1 }, tags: ['investigasi'] },
      { name: 'Coba Sekali, Siapa Tahu Menang', description: 'Menang sekali, kalah tiga puluh kali.', effects: { tabungan: -2, kerja: 1, keresahan: 1 } },
    ],
  },
  rupiah: {
    pemerintah: [
      { name: 'Subsidi Harga Obat Impor', description: 'Obat tetap terjangkau, kas membayar selisih kurs.', effects: { harga: -1, keresahan: -1, kas: -2 }, tags: ['belanja', 'subsidi'] },
      { name: 'Bangun Industri Substitusi Impor', description: 'Pabrik gandum dan obat lokal, kurs tidak lagi menakutkan tahun depan.', effects: { kas: -2 }, delayed: [{ inYears: 1, effects: { harga: -1, kerja: 1 } }], tags: ['belanja', 'infrastruktur'] },
      { name: 'Kampanye Cinta Rupiah', description: 'Baliho besar, kurs tetap tidak membaca baliho.', effects: { kas: 1, kepercayaan: -1, harga: 1 } },
    ],
    bankSentral: [
      { name: 'Intervensi Jual Cadangan Devisa', description: 'Rupiah ditahan, cadangan devisa menipis.', effects: { harga: -1, kas: -1, kredibilitas: 1 }, tags: ['rupiah'] },
      { name: 'Naikkan Bunga Tahan Modal Kabur', description: 'Investor kembali, kredit usaha ikut mahal.', effects: { harga: -1, kerja: -1, kredibilitas: 1 } },
      { name: 'Biarkan Rupiah Cari Jalan', description: 'Ekspor senang, dapur rumah tangga menangis.', effects: { kerja: 1, harga: 1, kredibilitas: -1 } },
    ],
    pengusaha: [
      { name: 'Pakai Bahan Baku Lokal', description: 'Tidak terganggu kurs, kualitas masih belajar.', effects: { harga: -1, modal: -1, kerja: 1 } },
      { name: 'Investasi Ekspor ke Pasar Baru', description: 'Kurs lemah jadi peluang, panen dolar tahun depan.', effects: { modal: -2 }, delayed: [{ inYears: 1, effects: { kerja: 1, modal: 3 } }], tags: ['investasi', 'ekspor'] },
      { name: 'Simpan Untung dalam Dolar', description: 'Kekayaan aman, rupiah makin lemah.', effects: { modal: 3, harga: 1, kepercayaan: -1 } },
    ],
    buruh: [
      { name: 'Tuntut Penyesuaian Upah', description: 'Upah mengejar harga, harga mengejar upah.', effects: { solidaritas: 1, kepercayaan: 1, harga: 1 }, tags: ['upah'] },
      { name: 'Runding Bonus Ekspor', description: 'Kalau ekspor untung, buruh ikut kebagian. Kalau tidak, sabar.', effects: { solidaritas: 1, kerja: 1, keresahan: 1 }, tags: ['dialog'] },
      { name: 'Demo Harga Kebutuhan Pokok', description: 'Suara rakyat terdengar sampai ke pasar valas.', effects: { solidaritas: 2, keresahan: 1, kepercayaan: -1 } },
    ],
    masyarakat: [
      { name: 'Ganti Gandum dengan Singkong', description: 'Impor berkurang, roti berubah rasa.', effects: { harga: -1, tabungan: 1, kepercayaan: -1 } },
      { name: 'Awasi Penimbun Barang Impor', description: 'Gudang obat penuh terbongkar, pemiliknya pura-pura lupa.', effects: { kepercayaan: 1, keresahan: 1 }, tags: ['investigasi'] },
      { name: 'Beli Dolar Selagi Bisa', description: 'Tabungan aman, rupiah makin tertekan.', effects: { tabungan: 1, harga: 1, kepercayaan: -1 } },
    ],
  },
  resesi: {
    pemerintah: [
      { name: 'Bantuan Tunai Pekerja Dirumahkan', description: 'Belanja rumah tangga terjaga, kas ikut resesi.', effects: { keresahan: -1, kerja: 1, kas: -2 }, tags: ['belanja', 'bansos'] },
      { name: 'Proyek Padat Karya Infrastruktur', description: 'Jalan desa dibangun, pekerjaan tumbuh tahun depan.', effects: { kas: -2 }, delayed: [{ inYears: 1, effects: { kerja: 2 } }], tags: ['belanja', 'infrastruktur'] },
      { name: 'Potong Anggaran Pendidikan', description: 'Kas aman tahun ini, masa depan dicicil.', effects: { kas: 2, kepercayaan: -1, keresahan: 1 } },
    ],
    bankSentral: [
      { name: 'Turunkan Bunga Dorong Kredit', description: 'Usaha bernapas, harga naik tahun depan.', effects: { kerja: 1 }, delayed: [{ inYears: 1, effects: { harga: 1 } }] },
      { name: 'Jaga Stabilitas Rupiah', description: 'Kurs tenang di tengah badai luar negeri.', effects: { harga: -1, kredibilitas: 1, kas: -1 }, tags: ['rupiah'] },
      { name: 'Cetak Optimisme Lewat Pidato', description: 'Kata "resiliensi" diucapkan 40 kali.', effects: { keresahan: -1, kredibilitas: -1 } },
    ],
    pengusaha: [
      { name: 'Cari Pembeli Dalam Negeri', description: 'Pesanan lokal menyelamatkan pabrik, harga harus lebih murah.', effects: { kerja: 1, modal: -1 }, tags: ['ekspor'] },
      { name: 'Investasi Saat Mesin Murah', description: 'Beli mesin waktu harga jatuh, panen saat pulih.', effects: { modal: -2 }, delayed: [{ inYears: 1, effects: { kerja: 1, modal: 3 } }], tags: ['investasi'] },
      { name: 'Lobi Keringanan Pajak Ekspor', description: 'Amplop untuk insentif yang mungkin datang.', effects: { modal: -1, kepercayaan: -1 }, tags: ['lobi'] },
    ],
    buruh: [
      { name: 'Tuntut Upah Walau Dirumahkan', description: 'Buruh bertahan hidup, pabrik makin berat bertahan.', effects: { solidaritas: 1, kepercayaan: 1, kerja: -1 }, tags: ['upah'] },
      { name: 'Sepakati Potong Jam, Bukan PHK', description: 'Semua kerja lebih pendek, tidak ada yang pulang selamanya.', effects: { kerja: 1, solidaritas: -1, keresahan: -1 }, tags: ['dialog'] },
      { name: 'Unjuk Rasa di Kawasan Industri', description: 'Kawasan macet, pembeli luar negeri tetap tidak memesan.', effects: { solidaritas: 2, keresahan: 1 } },
    ],
    masyarakat: [
      { name: 'Belanja di UMKM Tetangga', description: 'Uang berputar di kampung, tabungan sedikit berkurang.', effects: { kerja: 1, tabungan: -1 } },
      { name: 'Awasi Dana Stimulus', description: 'Laporan proyek fiktif masuk ke meja wartawan.', effects: { kepercayaan: 1, keresahan: 1 }, tags: ['investigasi'] },
      { name: 'Tahan Semua Belanja', description: 'Tabungan aman, toko-toko sepi pembeli.', effects: { tabungan: 2, kerja: -1, harga: -1 } },
    ],
  },
  latihan: {
    pemerintah: [
      { name: 'Klarifikasi Resmi di Televisi', description: 'Gosip diluruskan, sebagian warga tetap percaya grup keluarga.', effects: { keresahan: -1, kas: -1 } },
      { name: 'Operasi Pasar Gula', description: 'Stok dilepas, panic buying reda.', effects: { harga: -1, kas: -1 }, tags: ['belanja'] },
      { name: 'Diam Saja, Nanti Juga Reda', description: 'Hemat tenaga, gosip makin liar.', effects: { kas: 1, keresahan: 1 } },
    ],
    bankSentral: [
      { name: 'Umumkan Data Harga Asli', description: 'Angka resmi menenangkan pasar.', effects: { keresahan: -1, kredibilitas: 1, modal: -1 } },
      { name: 'Tahan Uang Beredar', description: 'Harga tenang, usaha agak seret.', effects: { harga: -1, kerja: -1 } },
      { name: 'Ikut Bilang Harga Akan Naik', description: 'Ekspektasi naik, harga ikut naik.', effects: { harga: 1, kerja: 1 } },
    ],
    pengusaha: [
      { name: 'Tahan Harga Gula di Toko', description: 'Pelanggan senang, untung tipis.', effects: { harga: -1, modal: -1 } },
      { name: 'Tambah Stok ke Pasar', description: 'Barang cukup, gosip kehilangan bahan.', effects: { keresahan: -1, modal: -1, kerja: 1 } },
      { name: 'Naikkan Harga Ikut Gosip', description: 'Untung cepat, pelanggan kesal.', effects: { modal: 2, harga: 1 } },
    ],
    buruh: [
      { name: 'Minta Kenaikan Gaji Antisipasi', description: 'Buruh tenang, harga sedikit naik.', effects: { solidaritas: 1, harga: 1 }, tags: ['upah'] },
      { name: 'Sebarkan Info Resmi ke Anggota', description: 'Anggota tidak ikut memborong.', effects: { keresahan: -1, solidaritas: 1, kerja: -1 }, tags: ['dialog'] },
      { name: 'Ikut Memborong Gula', description: 'Dapur buruh aman, rak toko kosong.', effects: { solidaritas: 1, harga: 1 } },
    ],
    masyarakat: [
      { name: 'Cek Fakta Sebelum Membagikan', description: 'Gosip berhenti di grup keluarga.', effects: { keresahan: -1, kepercayaan: 1, tabungan: -1 } },
      { name: 'Cari Sumber Gosipnya', description: 'Ternyata dari akun jualan gula.', effects: { kepercayaan: 1, keresahan: 1 }, tags: ['investigasi'] },
      { name: 'Borong Gula Sekarang Juga', description: 'Rumah penuh gula, harga benar-benar naik.', effects: { tabungan: -1, harga: 1, keresahan: -1 } },
    ],
  },
  // Monthly packs keep their responses beside their cards (engine/src/content/packs).
  ...RESPONSES_2026_10,
};
