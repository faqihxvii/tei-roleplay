import type { CrisisCard } from '../../types';
import type { ResponseSet } from '../responses';

// Paket Oktober 2026: seven crises from the news of 19 September–19 October 2026, each one
// fictionalised (no real people, brands or institutions by name). The real events, with sources,
// are in room/src/content/realWorld.ts. How to write next month's pack: docs/paket-krisis.md.

export const PACK_2026_10: CrisisCard[] = [
  { id: 'c_cabai', category: 'pangan', title: 'Cabai Pedas, Harga Lebih Pedas', effects: { harga: 1, keresahan: 1 }, modifier: { kind: 'scaleTag', tag: 'subsidi', factor: 2 }, ruleText: 'Kartu Subsidi bernilai dua kali lipat, biayanya juga.', narrative: 'Hujan salah musim merusak kebun cabai, dan ayam potong ikut mahal karena pakan naik. Pedagang gorengan mengganti sambal dengan saus botol, warung menaikkan harga nasi telur. Menteri menyarankan warga menanam cabai di pot sendiri, sambil berfoto di kebun percontohan yang baru ditanam kemarin sore.', question: 'Kalau harga pangan naik, lebih baik negara memberi subsidi, membuka impor, atau membiarkan pasar menyesuaikan?', concepts: ['inflasi pangan', 'subsidi', 'penawaran dan permintaan'] },
  { id: 'c_makansiang', category: 'pangan', title: 'Makan Siang Ajaib Bikin Sakit Perut', effects: { kepercayaan: -1, kerja: -1 }, modifier: { kind: 'endOfYear', effects: { kepercayaan: -1 } }, ruleText: 'Tiap pekan ada berita keracunan baru: Kepercayaan -1 di akhir tahun.', narrative: 'Program Makan Siang Ajaib membagikan jutaan porsi gratis setiap hari. Anggarannya raksasa, dapurnya dikebut, pengawasnya kurang. Puluhan siswa di beberapa daerah dilarikan ke puskesmas seusai makan. Pejabat menyebut keracunan itu "dinamika di lapangan" dan berjanji menambah menu susu, bukan menambah pengawas dapur.', question: 'Program besar yang niatnya baik tetapi pelaksanaannya bermasalah: diperbaiki, dikecilkan, atau dihentikan?', concepts: ['belanja negara', 'biaya peluang', 'tata kelola'] },
  { id: 'c_antrebbm', category: 'energi', title: 'Antre Bensin Satu Kilometer', effects: { kerja: -1, keresahan: 1 }, modifier: { kind: 'endOfYear', effects: { kas: -1 } }, ruleText: 'Kapal tanker tambahan disewa mendadak: Kas -1 di akhir tahun.', narrative: 'Bensin bersubsidi mendadak langka di pulau wisata. Antrean motor mengular satu kilometer, pengemudi ojek daring berhenti narik, kampus kembali kuliah daring. Perusahaan minyak negara menyalahkan kapal yang telat buang jangkar, pejabat bilang stok aman. Warga bertanya, aman di mana? Pembelian bensin pun diatur ganjil-genap seperti jalan raya.', question: 'Kalau harga bensin ditahan murah tetapi barangnya langka, apakah warga benar-benar diuntungkan?', concepts: ['subsidi energi', 'kelangkaan', 'harga tertinggi'] },
  { id: 'c_pinjolguru', category: 'keuangan', title: 'Guru Terjerat Pinjol, Murid Ikut Pusing', effects: { tabungan: -1, keresahan: 1 }, modifier: { kind: 'scaleTag', tag: 'edukasi', factor: 2 }, ruleText: 'Kartu edukasi keuangan bernilai dua kali lipat.', narrative: 'Puluhan juta warga pernah terjerat pinjaman daring, dan banyak di antaranya guru bergaji pas-pasan. Bunganya dihitung harian, penagihnya menelepon kepala sekolah. Laporan penipuan digital juga menumpuk. Sementara itu, seminar literasi keuangan digelar di hotel berbintang, dengan peserta yang diberi uang saku supaya mau datang.', question: 'Kenapa orang yang paham pentingnya pendidikan tetap bisa terjerat utang berbunga tinggi?', concepts: ['literasi keuangan', 'bunga majemuk', 'utang konsumtif'] },
  { id: 'c_phkmassal', category: 'ketenagakerjaan', title: 'Badai PHK Belum Juga Reda', effects: { kerja: -1, tabungan: -1 }, modifier: { kind: 'scaleTag', tag: 'investasi', factor: 2 }, ruleText: 'Kartu Investasi bernilai dua kali lipat, biayanya juga.', narrative: 'Puluhan ribu pekerja kena PHK sejak awal tahun, paling banyak di kawasan industri padat karya. Pabrik sepatu dan garmen pindah ke negara yang upahnya lebih murah. Pemerintah meluncurkan pelatihan kerja daring, tetapi servernya tumbang saat pendaftaran dibuka. Pesangon dijanjikan cair, tanggalnya masih dirahasiakan.', question: 'Saat pabrik tutup, mana yang lebih penting: menarik investor baru atau melatih pekerja untuk pekerjaan lain?', concepts: ['pengangguran', 'investasi', 'industri padat karya'] },
  { id: 'c_potongan', category: 'digital', title: 'Potongan Aplikasi Dipangkas Jadi 8 Persen', effects: { harga: 1, kerja: -1 }, modifier: { kind: 'scaleTag', tag: 'dialog', factor: 2 }, ruleText: 'Kartu dialog buruh bernilai dua kali lipat.', narrative: 'Aturan baru membatasi potongan aplikasi ojek daring paling banyak 8 persen. Pengemudi bersorak, perusahaan aplikasi Ojek Kilat langsung menghitung ulang: bonus dihapus, tarif penumpang naik, dan "biaya layanan" baru muncul di struk. Semua pihak mengaku menang di konferensi pers. Penumpang tidak diundang.', question: 'Kalau potongan aplikasi dibatasi, siapa yang akhirnya menanggung biayanya: perusahaan, pengemudi, atau penumpang?', concepts: ['ekonomi gig', 'regulasi harga', 'beban biaya'] },
  { id: 'c_bursa', category: 'global', title: 'Bursa Anjlok, Rupiah Tembus 18 Ribu', effects: { kepercayaan: -1, harga: 1 }, modifier: { kind: 'scaleTag', tag: 'rupiah', factor: 2 }, ruleText: 'Kartu Intervensi Rupiah bernilai dua kali lipat, biayanya juga.', narrative: 'Lembaga Indeks Global mengancam mencoret bursa kita dari daftar pasar berkembang karena sahamnya dikuasai segelintir pemilik. Investor asing kabur, indeks saham jatuh belasan persen sepekan, perdagangan sempat dihentikan, dan rupiah tembus 18 ribu per dolar. Pejabat mengimbau warga tetap tenang dan membeli saham, dimulai dari pejabat lain.', question: 'Kenapa keputusan sebuah lembaga di luar negeri bisa membuat harga barang impor di warung naik?', concepts: ['pasar modal', 'nilai tukar', 'arus modal asing'] },
];

export const RESPONSES_2026_10: Record<string, ResponseSet> = {
  cabai: {
    pemerintah: [
      { name: 'Operasi Pasar Cabai Murah', description: 'Antrean panjang di pasar, cabai murah, kas negara ikut kepedasan.', effects: { harga: -1, keresahan: -1, kas: -2 }, tags: ['belanja', 'subsidi'] },
      { name: 'Gudang Dingin di Sentra Cabai', description: 'Panen raya tidak busuk lagi, harga stabil mulai tahun depan.', effects: { kas: -2 }, delayed: [{ inYears: 1, effects: { harga: -1, kerja: 1 } }], tags: ['belanja', 'infrastruktur'] },
      { name: 'Imbau Tanam Cabai di Pot', description: 'Gratis untuk kas. Warga kota bertanya potnya ditaruh di mana.', effects: { kas: 1, kepercayaan: -1, keresahan: 1 } },
    ],
    bankSentral: [
      { name: 'Naikkan Bunga Sedikit', description: 'Inflasi diredam, cicilan motor warga ikut naik.', effects: { harga: -1, kerja: -1, kredibilitas: 1 } },
      { name: 'Tim Pantau Harga Pangan', description: 'Data harga cabai diumumkan tiap pekan, pasar tenang, tengkulak gerah.', effects: { keresahan: -1, kredibilitas: 1, modal: -1 } },
      { name: 'Salahkan Cuaca di Depan Kamera', description: 'Secara teknis benar, secara politik malas.', effects: { kredibilitas: -1, kepercayaan: -1, kerja: 1 } },
    ],
    pengusaha: [
      { name: 'Paket Sambal Hemat', description: 'Porsi kecil harga ramah, untung tipis, pelanggan setia.', effects: { harga: -1, modal: -1, kepercayaan: 1 } },
      { name: 'Kemitraan dengan Petani Cabai', description: 'Modal keluar sekarang, pasokan aman dan murah tahun depan.', effects: { modal: -2 }, delayed: [{ inYears: 1, effects: { harga: -1, kerja: 1, modal: 3 } }], tags: ['investasi'] },
      { name: 'Ganti Sambal dengan Saus Botol', description: 'Biaya turun, harga tetap, pelanggan merasa ditipu.', effects: { modal: 2, kepercayaan: -1 } },
    ],
    buruh: [
      { name: 'Tuntut Tunjangan Makan', description: 'Dapur buruh selamat, pengusaha menaikkan harga.', effects: { solidaritas: 1, kepercayaan: 1, harga: 1 }, tags: ['upah'] },
      { name: 'Kantin Koperasi Buruh', description: 'Makan siang lebih murah, butuh waktu dan iuran anggota.', effects: { solidaritas: 1, keresahan: -1, kerja: -1 }, tags: ['dialog'] },
      { name: 'Aksi Bawa Cabai ke Kementerian', description: 'Fotonya viral, harga cabai tidak peduli.', effects: { solidaritas: 2, keresahan: 1 } },
    ],
    masyarakat: [
      { name: 'Masak di Rumah Saja', description: 'Hemat dan sehat, warung langganan sepi pembeli.', effects: { tabungan: 1, harga: -1, kerja: -1 } },
      { name: 'Laporkan Tengkulak Nakal', description: 'Permainan harga terbongkar, tengkulak pura-pura terkejut.', effects: { kepercayaan: 1, keresahan: 1 }, tags: ['investigasi'] },
      { name: 'Borong Cabai Sekarung', description: 'Kulkas penuh, tetangga kehabisan, harga makin naik.', effects: { tabungan: -2, harga: 1, kerja: 1 } },
    ],
  },
  makansiang: {
    pemerintah: [
      { name: 'Tambah Porsi, Tambah Anggaran', description: 'Lebih banyak anak kenyang, lebih banyak dapur tanpa pengawas.', effects: { kepercayaan: 1, kerja: 1, kas: -2, keresahan: 1 }, tags: ['belanja', 'bansos'] },
      { name: 'Sertifikasi Semua Dapur', description: 'Program melambat tahun ini, tapi aman dan dipercaya tahun depan.', effects: { kas: -1, kerja: -1 }, delayed: [{ inYears: 1, effects: { kepercayaan: 2 } }], tags: ['investigasi'] },
      { name: 'Sebut Keracunan Itu Dinamika', description: 'Hemat biaya klarifikasi, mahal biaya kepercayaan.', effects: { kas: 1, kepercayaan: -2 } },
    ],
    bankSentral: [
      { name: 'Hitung Ulang Dampak Inflasi', description: 'Pasar tenang karena tahu angkanya, dapur tetap bermasalah.', effects: { keresahan: -1, kredibilitas: 1, kepercayaan: -1 } },
      { name: 'Ingatkan Defisit Anggaran', description: 'Peringatan yang tepat, Menteri tersinggung di rapat.', effects: { kredibilitas: 1, kepercayaan: -1 } },
      { name: 'Longgarkan Kredit Dapur Mitra', description: 'Dapur baru tumbuh cepat, kualitasnya ikut cepat turun.', effects: { kerja: 1, harga: 1, kredibilitas: -1 } },
    ],
    pengusaha: [
      { name: 'Dapur Mitra Standar Hotel', description: 'Mahal di awal, kontrak bertahan lama karena tidak ada korban.', effects: { modal: -2, kepercayaan: 1 }, delayed: [{ inYears: 1, effects: { modal: 3 } }], tags: ['investasi'] },
      { name: 'Buka Dapur Mitra Baru', description: 'Lowongan juru masak terbuka, pengalaman tidak ditanya.', effects: { kerja: 1, modal: 1, keresahan: 1 } },
      { name: 'Hemat Lauk, Tambah Kuah', description: 'Margin naik, gizinya tinggal nama programnya.', effects: { modal: 3, kepercayaan: -2 } },
    ],
    buruh: [
      { name: 'Serikat Juru Masak Dapur', description: 'Jam kerja manusiawi, nasi tidak lagi dimasak jam dua pagi.', effects: { solidaritas: 1, keresahan: -1, kerja: -1 }, tags: ['dialog'] },
      { name: 'Tuntut Upah Layak Juru Masak', description: 'Pekerja dapur sejahtera, biaya per porsi naik.', effects: { solidaritas: 1, harga: 1 }, tags: ['upah'] },
      { name: 'Mogok Masak Sehari', description: 'Tuntutan didengar, ribuan anak tidak makan siang.', effects: { solidaritas: 2, keresahan: 1, kerja: -1 } },
    ],
    masyarakat: [
      { name: 'Bawa Bekal dari Rumah', description: 'Anak aman, uang belanja keluarga berkurang.', effects: { tabungan: -1, keresahan: -1 } },
      { name: 'Orang Tua Awasi Dapur', description: 'Relawan ronda dapur, kualitas naik, waktu kerja tersita.', effects: { kepercayaan: 1, kerja: -1 }, tags: ['investigasi'] },
      { name: 'Unggah Foto Menu Basi', description: 'Viral dalam semalam, kantin sekolah jadi tontonan.', effects: { keresahan: 1, kepercayaan: -1, solidaritas: 1 } },
    ],
  },
  antrebbm: {
    pemerintah: [
      { name: 'Tambah Kuota Bensin Subsidi', description: 'Antrean bubar, tagihan subsidi menumpuk di meja bendahara.', effects: { keresahan: -1, kerja: 1, kas: -2 }, tags: ['belanja', 'subsidi'] },
      { name: 'Bangun Depo di Tiap Pulau', description: 'Mahal dan lama, tapi kapal telat tidak lagi bikin panik.', effects: { kas: -2 }, delayed: [{ inYears: 1, effects: { kerja: 1, keresahan: -1 } }], tags: ['belanja', 'infrastruktur'] },
      { name: 'Ganjil-Genap Beli Bensin', description: 'Kas aman, warga menghitung tanggal sebelum ke SPBU.', effects: { kas: 1, kerja: -1, keresahan: 1 } },
    ],
    bankSentral: [
      { name: 'Tahan Rupiah Agar Impor Murah', description: 'Bensin impor tidak makin mahal, cadangan devisa terkuras.', effects: { harga: -1, kredibilitas: -1 }, tags: ['rupiah'] },
      { name: 'Umumkan Perkiraan Inflasi', description: 'Pasar tahu batasnya, antrean tetap panjang dan warga kesal.', effects: { kredibilitas: 1, keresahan: 1 } },
      { name: 'Bilang Ini Masalah Logistik', description: 'Benar dan aman, tapi warga butuh bensin, bukan diagnosis.', effects: { kredibilitas: 1, kepercayaan: -1 } },
    ],
    pengusaha: [
      { name: 'Antar Bensin ke Nelayan', description: 'Kapal nelayan jalan lagi, ongkos antar ditanggung sendiri.', effects: { kerja: 1, modal: -1, kepercayaan: 1 } },
      { name: 'Ganti Armada ke Motor Listrik', description: 'Modal besar sekarang, bebas antre tahun depan.', effects: { modal: -2 }, delayed: [{ inYears: 1, effects: { kerja: 1, modal: 3 } }], tags: ['investasi'] },
      { name: 'Jual Bensin Eceran Harga Panik', description: 'Untung besar dari botol bekas, pembeli mengumpat.', effects: { modal: 3, harga: 1, kepercayaan: -1 } },
    ],
    buruh: [
      { name: 'Minta Kerja dari Rumah', description: 'Pekerja tidak antre, sebagian pabrik terpaksa berhenti.', effects: { keresahan: -1, kerja: -1, solidaritas: 1 }, tags: ['dialog'] },
      { name: 'Tuntut Uang Transport', description: 'Ongkos antre diganti, pengusaha menaikkan harga.', effects: { solidaritas: 1, harga: 1 }, tags: ['upah'] },
      { name: 'Blokir Jalan Depan Depo', description: 'Kamera datang, truk tangki malah tertahan.', effects: { solidaritas: 2, keresahan: 1, kerja: -1 } },
    ],
    masyarakat: [
      { name: 'Naik Sepeda dan Nebeng', description: 'Hemat bensin dan sehat, bengkel motor sepi.', effects: { tabungan: 1, kerja: -1 } },
      { name: 'Laporkan Penimbun Jeriken', description: 'Gudang bensin gelap terbongkar, pemiliknya kabur.', effects: { kepercayaan: 1, keresahan: 1 }, tags: ['investigasi'] },
      { name: 'Isi Penuh Tiap Hari', description: 'Tangki aman, SPBU kosong lebih cepat.', effects: { tabungan: -1, keresahan: 1, kerja: 1 } },
    ],
  },
  pinjolguru: {
    pemerintah: [
      { name: 'Lunasi Utang Pinjol Guru', description: 'Guru lega, pinjol bersorak, kas negara menangis.', effects: { keresahan: -1, kepercayaan: 1, kas: -2 }, tags: ['belanja', 'bansos'] },
      { name: 'Literasi Keuangan di Kurikulum', description: 'Tidak instan, tapi murid tahun depan paham bunga harian.', effects: { kas: -1 }, delayed: [{ inYears: 1, effects: { tabungan: 1, keresahan: -1 } }], tags: ['edukasi'] },
      { name: 'Seminar di Hotel Berbintang', description: 'Pesertanya dapat uang saku, utangnya tetap sama.', effects: { kas: -1, kepercayaan: -1, kerja: 1 } },
    ],
    bankSentral: [
      { name: 'Kampanye Cek Izin Pinjaman', description: 'Warga belajar membedakan pinjaman legal, butuh waktu.', effects: { tabungan: 1, kredibilitas: 1, modal: -1 }, tags: ['edukasi'] },
      { name: 'Batasi Bunga Harian', description: 'Bunga mencekik dilarang, pinjaman jadi lebih susah cair.', effects: { keresahan: -1, kerja: -1, kredibilitas: 1 } },
      { name: 'Serahkan ke Pengawas Lain', description: 'Bukan wewenang kami, kata rapat yang berlangsung enam jam.', effects: { kredibilitas: -1, kepercayaan: -1, kas: 1 } },
    ],
    pengusaha: [
      { name: 'Kasbon Tanpa Bunga Karyawan', description: 'Pekerja tidak lari ke pinjol, modal perusahaan tertahan.', effects: { modal: -1, tabungan: 1, kepercayaan: 1 } },
      { name: 'Bangun Koperasi Simpan Pinjam', description: 'Modal awal besar, bunga wajar dan untung jangka panjang.', effects: { modal: -2 }, delayed: [{ inYears: 1, effects: { tabungan: 1, modal: 3 } }], tags: ['investasi'] },
      { name: 'Pasang Iklan Pinjol di Toko', description: 'Uang iklan masuk, pembeli pulang membawa utang.', effects: { modal: 2, tabungan: -1, keresahan: 1 } },
    ],
    buruh: [
      { name: 'Tuntut Gaji Guru Tepat Waktu', description: 'Guru tidak perlu meminjam untuk menunggu gaji, kas terbebani.', effects: { solidaritas: 1, kepercayaan: 1, kas: -1 }, tags: ['upah'] },
      { name: 'Kelas Atur Uang Antaranggota', description: 'Anggota saling mengajari, rapat serikat makin panjang.', effects: { solidaritas: 1, tabungan: 1, kerja: -1 }, tags: ['edukasi', 'dialog'] },
      { name: 'Demo Penagih Pinjol', description: 'Penagih kabur sementara, besok datang lagi.', effects: { solidaritas: 2, keresahan: 1 } },
    ],
    masyarakat: [
      { name: 'Belajar Hitung Bunga Bersama', description: 'Grup keluarga jadi kelas matematika, belanja ditahan dulu.', effects: { tabungan: 1, kerja: -1 }, tags: ['edukasi'] },
      { name: 'Laporkan Aplikasi Ilegal', description: 'Ratusan aplikasi diblokir, besok muncul dengan nama baru.', effects: { kepercayaan: 1, keresahan: 1 }, tags: ['investigasi'] },
      { name: 'Gali Lubang Tutup Lubang', description: 'Utang lama lunas pakai utang baru, belanja tetap jalan.', effects: { kerja: 1, tabungan: -2, keresahan: 1 } },
    ],
  },
  phkmassal: {
    pemerintah: [
      { name: 'Bantuan Tunai Korban PHK', description: 'Dapur tetap ngebul beberapa bulan, kas negara menipis.', effects: { keresahan: -1, kepercayaan: 1, kas: -2 }, tags: ['belanja', 'bansos'] },
      { name: 'Kawasan Industri Baru', description: 'Lahan dan jalan dibangun sekarang, pabrik baru datang tahun depan.', effects: { kas: -2 }, delayed: [{ inYears: 1, effects: { kerja: 2 } }], tags: ['belanja', 'investasi'] },
      { name: 'Pelatihan Daring Server Tumbang', description: 'Anggaran terserap, pesertanya menunggu loading.', effects: { kas: 1, kepercayaan: -1, keresahan: 1 } },
    ],
    bankSentral: [
      { name: 'Turunkan Suku Bunga', description: 'Kredit pabrik lebih murah, harga ikut merangkak.', effects: { kerja: 1, harga: 1 } },
      { name: 'Kredit Murah Usaha Padat Karya', description: 'Pabrik yang menyerap banyak pekerja didahulukan, risiko macet naik.', effects: { kerja: 1, kredibilitas: -1 }, tags: ['investasi'] },
      { name: 'Fokus Jaga Inflasi Saja', description: 'Harga stabil, pengangguran bukan urusan kantor ini.', effects: { harga: -1, kredibilitas: 1, kepercayaan: -1 } },
    ],
    pengusaha: [
      { name: 'Kurangi Jam, Jangan PHK', description: 'Pekerja tetap digaji walau separuh, laba ikut separuh.', effects: { kerja: 1, modal: -1 } },
      { name: 'Pindah ke Produk Bernilai Tinggi', description: 'Mesin baru dibeli sekarang, pesanan ekspor datang tahun depan.', effects: { modal: -2 }, delayed: [{ inYears: 1, effects: { kerja: 1, modal: 3 } }], tags: ['investasi'] },
      { name: 'Pindahkan Pabrik ke Luar Negeri', description: 'Upah lebih murah di seberang, kota lama jadi sepi.', effects: { modal: 3, kerja: -2 }, tags: ['phk'] },
    ],
    buruh: [
      { name: 'Tuntut Pesangon Penuh', description: 'Pekerja punya bekal, pabrik makin enggan merekrut.', effects: { solidaritas: 1, tabungan: 1, kerja: -1 }, tags: ['upah'] },
      { name: 'Runding Program Alih Keahlian', description: 'Pekerja dilatih untuk pabrik baru, perlu kesabaran semua pihak.', effects: { solidaritas: 1, kerja: 1, modal: -1 }, tags: ['dialog'] },
      { name: 'Duduki Pabrik yang Tutup', description: 'Mesin dijaga siang malam, investor baru takut mendekat.', effects: { solidaritas: 2, keresahan: 1, kerja: -1 } },
    ],
    masyarakat: [
      { name: 'Beli Produk Lokal', description: 'Pabrik dalam negeri tertolong, harganya sedikit lebih mahal.', effects: { kerja: 1, tabungan: -1 } },
      { name: 'Buka Usaha Kecil Bersama', description: 'Tetangga yang kena PHK punya kerja, modalnya dari tabungan.', effects: { kerja: 1, tabungan: -1, keresahan: -1 } },
      { name: 'Tahan Belanja Total', description: 'Tabungan aman, toko-toko ikut merumahkan pegawai.', effects: { tabungan: 2, kerja: -1 } },
    ],
  },
  potongan: {
    pemerintah: [
      { name: 'Subsidi Tarif Penumpang', description: 'Tarif tidak naik, pengemudi senang, kas menanggung selisihnya.', effects: { harga: -1, kerja: 1, kas: -2 }, tags: ['belanja', 'subsidi'] },
      { name: 'Jaminan Sosial Pengemudi', description: 'Iuran mulai sekarang, pengemudi terlindungi tahun depan.', effects: { kas: -1 }, delayed: [{ inYears: 1, effects: { kepercayaan: 1, keresahan: -1 } }] },
      { name: 'Klaim Menang di Konferensi Pers', description: 'Gratis. Penumpang membaca struk dan tidak setuju.', effects: { kas: 1, kepercayaan: -1, harga: 1 } },
    ],
    bankSentral: [
      { name: 'Pantau Harga Jasa Transportasi', description: 'Kenaikan tarif tercatat rapi, belum tentu bisa dicegah.', effects: { kredibilitas: 1, harga: 1 } },
      { name: 'Kredit Motor Murah Pengemudi', description: 'Pengemudi baru bertambah, uang beredar ikut bertambah.', effects: { kerja: 1, harga: 1 } },
      { name: 'Anggap Tarif Bukan Inflasi Inti', description: 'Secara statistik rapi, secara dompet tidak.', effects: { kredibilitas: 1, kepercayaan: -1 } },
    ],
    pengusaha: [
      { name: 'Efisiensi Tanpa Naik Tarif', description: 'Biaya dipangkas di kantor pusat, laba turun, pelanggan bertahan.', effects: { harga: -1, modal: -1, kepercayaan: 1 } },
      { name: 'Forum Tetap Pengemudi-Aplikasi', description: 'Aturan dibahas bersama, keputusan lebih lambat tapi awet.', effects: { keresahan: -1, modal: -1 }, tags: ['dialog'] },
      { name: 'Tambah Biaya Layanan di Struk', description: 'Potongan resmi 8 persen, biaya lain-lain tak terbatas.', effects: { modal: 3, harga: 1, kepercayaan: -1 } },
    ],
    buruh: [
      { name: 'Runding Tarif Bersama Aplikasi', description: 'Kesepakatan tertulis, pengemudi rela potongan bonus.', effects: { solidaritas: 1, keresahan: -1, kerja: -1 }, tags: ['dialog'] },
      { name: 'Tuntut Tarif Minimum Naik', description: 'Pendapatan pengemudi naik, penumpang mulai jalan kaki.', effects: { solidaritas: 1, harga: 1 }, tags: ['upah'] },
      { name: 'Matikan Aplikasi Serentak', description: 'Kota lumpuh sehari, semua sadar betapa pentingnya ojek.', effects: { solidaritas: 2, keresahan: 1, kerja: -1 } },
    ],
    masyarakat: [
      { name: 'Pindah ke Angkot dan Bus', description: 'Ongkos lebih murah, waktu tempuh lebih lama.', effects: { tabungan: 1, kerja: -1 } },
      { name: 'Beri Tip Langsung ke Pengemudi', description: 'Pengemudi tersenyum, dompet penumpang sedikit menipis.', effects: { tabungan: -1, keresahan: -1 } },
      { name: 'Unggah Struk Tarif Mahal', description: 'Viral, aplikasi minta maaf lalu menaikkan tarif pelan-pelan.', effects: { keresahan: 1, kepercayaan: -1, solidaritas: 1 } },
    ],
  },
  bursa: {
    pemerintah: [
      { name: 'Suntik Dana ke Bursa', description: 'Indeks naik sebentar, uang pajak ikut main saham.', effects: { kepercayaan: 1, kas: -2, harga: 1 } },
      { name: 'Reformasi Aturan Saham Bursa', description: 'Pemilik besar marah sekarang, investor asing kembali tahun depan.', effects: { kas: -1, kerja: -1 }, delayed: [{ inYears: 1, effects: { kepercayaan: 1, kerja: 1, kas: 1 } }], tags: ['investigasi'] },
      { name: 'Imbau Pejabat Beli Saham', description: 'Pejabat yang ditunjuk menunjuk pejabat lain.', effects: { kas: 1, kepercayaan: -1, keresahan: 1 } },
    ],
    bankSentral: [
      { name: 'Intervensi Rupiah Besar-besaran', description: 'Rupiah ditahan, cadangan devisa terkuras cepat.', effects: { harga: -1, kredibilitas: -2 }, tags: ['rupiah'] },
      { name: 'Naikkan Bunga Tahan Modal', description: 'Investor betah, kredit usaha jadi mahal.', effects: { harga: -1, kerja: -1, kredibilitas: 1 } },
      { name: 'Bilang Fundamental Kuat', description: 'Kalimat favorit saat grafik merah. Pasar tertawa.', effects: { kredibilitas: -1, kepercayaan: -1, kerja: 1 } },
    ],
    pengusaha: [
      { name: 'Beli Kembali Saham Sendiri', description: 'Harga saham ditopang, kas perusahaan tergerus.', effects: { kepercayaan: 1, modal: -2 } },
      { name: 'Lepas Lebih Banyak Saham', description: 'Kendali berkurang sekarang, bursa lebih sehat tahun depan.', effects: { modal: -1 }, delayed: [{ inYears: 1, effects: { kepercayaan: 1, modal: 2 } }], tags: ['investasi'] },
      { name: 'Parkir Uang di Dolar', description: 'Kekayaan aman di luar, rupiah makin tertekan.', effects: { modal: 2, harga: 1, kepercayaan: -1 }, tags: ['rupiah'] },
    ],
    buruh: [
      { name: 'Lindungi Dana Pensiun Buruh', description: 'Iuran buruh tidak ikut terjun, perundingan makan waktu.', effects: { solidaritas: 1, kepercayaan: 1, kerja: -1 }, tags: ['dialog'] },
      { name: 'Tuntut Upah Ikut Kurs', description: 'Daya beli terjaga, pabrik mengeluh biaya.', effects: { solidaritas: 1, harga: 1 }, tags: ['upah'] },
      { name: 'Demo di Depan Gedung Bursa', description: 'Spanduknya bagus, indeksnya tetap merah.', effects: { solidaritas: 2, keresahan: 1 } },
    ],
    masyarakat: [
      { name: 'Tahan Diri, Jangan Jual Panik', description: 'Investasi kecil tidak dijual rugi, belanja ikut ditahan.', effects: { tabungan: 1, keresahan: -1, kerja: -1 } },
      { name: 'Pindah ke Emas dan Deposito', description: 'Tabungan lebih aman, bursa kehilangan investor lokal.', effects: { tabungan: 1, kepercayaan: -1 } },
      { name: 'Borong Saham Kata Influencer', description: 'Semangat patriotik, portofolio tinggal separuh.', effects: { tabungan: -2, kepercayaan: 1 } },
    ],
  },
};
