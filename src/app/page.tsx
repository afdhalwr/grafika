import Link from 'next/link';
import { Brand } from '@/components/Brand';
import { Icon, type IconName } from '@/components/Icon';
import { HeroChart } from '@/components/landing/HeroChart';
import { LandingNav } from '@/components/landing/LandingNav';
import { Playground } from '@/components/landing/Playground';
import { RevealObserver } from '@/components/landing/Reveal';

const FEATURES: { icon: IconName; tone: string; title: string; text: React.ReactNode }[] = [
  { icon: 'chart', tone: 'primary', title: 'Grafik interaktif', text: 'Tren, komposisi kategori, dan pola harian. Arahkan kursor untuk detail, klik kategori untuk menyaring.' },
  { icon: 'plus', tone: 'mint', title: 'Tambah data kilat', text: <>Tekan <kbd>N</kbd> dari mana saja. Kategori terisi otomatis dari riwayat, dan ada tombol &quot;simpan &amp; tambah lagi&quot;.</> },
  { icon: 'sparkles', tone: 'peach', title: 'Wawasan otomatis', text: 'Grafika membaca datamu dan menuliskan temuan: kenaikan, kategori dominan, rekor, hingga hari tersibuk.' },
  { icon: 'calendar', tone: 'lemon', title: 'Rentang waktu fleksibel', text: '7, 30, 90 hari, atau tanggal pilihanmu — lengkap dengan perbandingan terhadap periode sebelumnya.' },
  { icon: 'file', tone: 'pink', title: 'Impor & ekspor', text: 'Bawa data dari spreadsheet lewat CSV, unduh grafik sebagai PNG, atau cetak laporan rapi.' },
  { icon: 'cloud', tone: 'primary', title: 'Sinkron di semua perangkat', text: 'Data tersimpan aman di cloud dan langsung muncul di laptop maupun ponsel. Mode gelap & pintasan keyboard sudah tersedia.' },
];

const STEPS = [
  ['Buat dataset', 'Beri nama, satuan (Rp, orang, jam…), warna, dan target bulanan jika perlu.'],
  ['Catat angka', 'Isi tanggal, kategori, dan nilai. Atau impor sekaligus dari file CSV.'],
  ['Baca ceritanya', 'Grafik, KPI, dan wawasan diperbarui seketika setiap kali data berubah.'],
];

const FAQ: [string, React.ReactNode][] = [
  ['Apakah Grafika gratis?', 'Ya. Semua fitur bisa dipakai tanpa biaya dan tanpa kartu kredit.'],
  ['Di mana dataku disimpan?', 'Di Google Cloud Firestore, terhubung ke akunmu. Hanya kamu yang bisa membaca dan mengubahnya, dan datamu ikut tersinkron saat kamu masuk dari perangkat lain.'],
  ['Bisakah aku mengimpor data dari Excel atau Google Sheets?', <>Bisa. Simpan lembarmu sebagai CSV dengan kolom <code className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[13px]">tanggal, kategori, nilai, catatan</code>, lalu impor dari dasbor.</>],
  ['Apa bedanya akun demo dan akun sendiri?', 'Akun demo dipakai bersama oleh semua pengunjung, dan datanya kembali ke contoh awal setiap kali ada yang masuk — jadi bebas dicoba. Akun sendiri juga dimulai dengan contoh data, tapi tersimpan permanen dan hanya bisa diakses olehmu.'],
];

const AUTHOR = {
  name: 'Afdhal Anwar',
  linkedin: 'https://www.linkedin.com/in/afdhal-anwar-431779211',
  github: 'https://github.com/afdhalwr/grafika',
};

const kicker ='mb-3 inline-block text-[13px] font-bold tracking-[0.1em] text-primary uppercase';
const sectionHead = 'reveal mx-auto mb-[52px] max-w-[640px] text-center short:mb-10';
const h2 = 'text-[clamp(28px,3.6vw,40px)] font-extrabold';

export default function LandingPage() {
  return (
    <>
      <a className="skip-link" href="#main">Lewati ke konten</a>
      <LandingNav />
      <RevealObserver />

      <main id="main">
        {/* ================= HERO ================= */}
        <section className="relative pt-12 pb-8 short:py-5">
          {/* latar lembut yang memudar ke bawah — tanpa tepi terpotong */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-[72px] bottom-[-120px] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_50%,transparent)]">
            <div className="absolute -top-[120px] right-[-6%] size-[520px] rounded-full bg-[#c9c7ff] opacity-50 blur-[90px] dark:opacity-[.18]" />
            <div className="absolute top-[38%] -left-[180px] size-[420px] rounded-full bg-[#ffd9e6] opacity-50 blur-[90px] dark:opacity-[.14]" />
          </div>

          <div className="wrap relative grid grid-cols-[1.05fr_1fr] items-center gap-14 max-lg:grid-cols-1 max-lg:gap-8 short:gap-10">
            <div className="reveal max-lg:text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-[7px] pr-3.5 pl-2.5 text-[13px] font-semibold text-fg-2 shadow-soft short:py-[5px]">
                <span className="text-primary"><Icon name="sparkles" /></span> Baru: wawasan otomatis dari datamu
              </span>
              <h1 className="mt-5 mb-[18px] text-[clamp(34px,5vw,56px)] font-extrabold tracking-[-0.035em] short:mt-3.5 short:mb-3 short:text-[clamp(34px,min(4.4vw,6.2vh),56px)]">
                Ubah deretan angka jadi <span className="grad-text">cerita yang mudah dipahami</span>.
              </h1>
              <p className="max-w-[540px] text-[17.5px] text-fg-2 max-lg:mx-auto short:text-base">
                Catat penjualan, pengunjung, atau jam belajar — Grafika langsung menyajikannya dalam grafik interaktif, ringkasan KPI, dan temuan penting. Tanpa rumus, tanpa ribet.
              </p>
              <div className="my-[30px] flex flex-wrap gap-3 max-lg:justify-center short:my-5">
                <Link className="btn btn-primary btn-lg" href="/login#daftar">Mulai gratis <Icon name="arrow-right" /></Link>
                <Link className="btn btn-outline btn-lg" href="/login?demo=1"><Icon name="zap" /> Coba akun demo</Link>
              </div>
              <ul className="flex flex-wrap gap-8 max-lg:justify-center max-sm:grid max-sm:grid-cols-3 max-sm:gap-3" aria-label="Sekilas tentang Grafika">
                {[
                  { count: 3, label: 'jenis grafik interaktif' },
                  { count: 100, suffix: '%', label: 'tersinkron antar-perangkat' },
                  { count: 60, prefix: '<', suffix: ' dtk', label: 'dari daftar ke grafik pertama' },
                ].map(s => (
                  <li key={s.label} className="flex flex-col">
                    <strong className="text-[26px] font-extrabold tracking-[-0.02em] max-sm:text-[22px] short:text-[22px]" data-count={s.count} data-prefix={s.prefix} data-suffix={s.suffix}>
                      {(s.prefix || '') + s.count + (s.suffix || '')}
                    </strong>
                    <span className="text-[13px] leading-snug text-muted max-sm:text-xs">{s.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="reveal relative px-5 pt-[46px] pb-11 max-sm:px-0 short:px-4 short:pt-[42px] short:pb-9" role="img" aria-label="Contoh tampilan dasbor Grafika">
              <div className="card rounded-[26px]! px-[22px] pt-[22px] pb-10 shadow-deep! short:px-[18px] short:pt-[18px]">
                <HeroChart />
              </div>
              <FloatCard className="top-0 -left-2 max-sm:left-0" icon="target" tone="mint" label="Target bulan ini" value="86% tercapai" />
              <FloatCard className="right-0 bottom-0 [animation-delay:-3s] max-sm:right-0" icon="sparkles" tone="primary" label="Wawasan" value="Kopi = 36% omzet" />
            </div>
          </div>

          <div className="wrap">
            <div className="reveal mt-10 flex flex-wrap items-center justify-center gap-x-[22px] gap-y-3.5 rounded-[18px] border border-line bg-surface px-6 py-[18px] short:mt-5 short:py-3">
              <span className="text-[13px] font-bold tracking-[0.08em] text-muted uppercase">Cocok untuk</span>
              <ul className="flex flex-wrap justify-center gap-x-[22px] gap-y-2">
                {['UMKM & toko', 'Pelajar & mahasiswa', 'Kreator konten', 'Tim kecil', 'Pencatat kebiasaan'].map(a => (
                  <li key={a} className="font-bold text-fg-2">{a}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ================= FITUR ================= */}
        <section className="py-24 max-sm:py-16 short:py-[72px]" id="fitur">
          <div className="wrap">
            <div className={sectionHead}>
              <span className={kicker}>Fitur</span>
              <h2 className={h2}>Semua yang kamu butuhkan untuk memahami datamu</h2>
              <p className="mt-3.5 text-[16.5px] text-fg-2">Dirancang supaya kamu fokus pada makna angka, bukan cara mengolahnya.</p>
            </div>
            <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
              {FEATURES.map(f => (
                <article key={f.title} className="reveal rounded-[22px] border border-line bg-surface p-7 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-float">
                  <span className={`tone tone-${f.tone} size-12 rounded-[14px] text-xl`}><Icon name={f.icon} /></span>
                  <h3 className="mt-[18px] mb-2 text-lg font-bold">{f.title}</h3>
                  <p className="text-[14.5px] text-fg-2">{f.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ================= CARA KERJA ================= */}
        <section className="border-y border-line bg-surface py-24 max-sm:py-16 short:py-[72px]" id="cara-kerja">
          <div className="wrap">
            <div className={sectionHead}>
              <span className={kicker}>Cara kerja</span>
              <h2 className={h2}>Tiga langkah, langsung paham</h2>
            </div>
            <ol className="grid grid-cols-3 gap-6 max-lg:grid-cols-1">
              {STEPS.map(([title, text], i) => (
                <li key={title} className="reveal rounded-[22px] border border-line bg-bg px-7 py-[30px]">
                  <span className="grid size-11 place-items-center rounded-full bg-primary text-lg font-extrabold text-on-primary shadow-[0_0_0_6px_var(--primary-soft)]">{i + 1}</span>
                  <h3 className="mt-5 mb-2 text-lg font-bold">{title}</h3>
                  <p className="text-[14.5px] text-fg-2">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ================= COBA LANGSUNG ================= */}
        <section className="py-24 max-sm:py-16 short:py-[72px]" id="coba">
          <Playground />
        </section>

        {/* ================= FAQ ================= */}
        <section className="border-y border-line bg-surface py-24 max-sm:py-16 short:py-[72px]" id="faq">
          <div className="wrap max-w-[780px]">
            <div className={sectionHead}>
              <span className={kicker}>FAQ</span>
              <h2 className={h2}>Pertanyaan yang sering muncul</h2>
            </div>
            <div className="reveal grid gap-3">
              {FAQ.map(([q, a], i) => (
                <details key={q} open={i === 0} className="group rounded-2xl border border-line bg-bg transition-colors open:border-primary">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-[22px] py-[18px] font-bold [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="text-muted transition-transform duration-300 group-open:rotate-180 group-open:text-primary"><Icon name="chevron-down" /></span>
                  </summary>
                  <p className="px-[22px] pb-5 text-fg-2">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ================= CTA ================= */}
        <section className="py-24 max-sm:py-16 short:py-[72px]">
          <div className="wrap">
            <div className="reveal flex flex-wrap items-center justify-between gap-8 rounded-[30px] bg-[radial-gradient(circle_at_85%_20%,rgba(255,255,255,.22),transparent_40%),linear-gradient(120deg,#5b5bf7_0%,#8e5cf2_55%,#d9669a_100%)] px-14 py-[52px] text-white shadow-deep max-sm:justify-center max-sm:px-6 max-sm:py-9 max-sm:text-center">
              <div>
                <h2 className="text-[clamp(26px,3vw,36px)] font-extrabold">Siap melihat datamu bercerita?</h2>
                <p className="mt-2 opacity-90">Buat akun dalam hitungan detik, atau langsung jelajahi akun demo.</p>
              </div>
              <div className="flex flex-wrap gap-3 max-sm:w-full max-sm:justify-center">
                <Link className="btn btn-lg [--btn-bg:#fff] [--btn-fg:#3a3ad6]" href="/login#daftar">Buat akun gratis</Link>
                <Link className="btn btn-lg border-white/40! [--btn-bg:rgba(255,255,255,.14)] [--btn-fg:#fff] hover:[--btn-bg:rgba(255,255,255,.24)]" href="/login?demo=1">Lihat demo</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line pt-8 pb-10">
        <div className="wrap flex flex-wrap items-center justify-between gap-4 text-sm text-muted max-sm:justify-center max-sm:text-center">
          <Brand small />
          <p>
            Dibuat oleh{' '}
            <a href={AUTHOR.linkedin} target="_blank" rel="noopener noreferrer" className="font-semibold text-fg-2 no-underline hover:text-primary">{AUTHOR.name}</a>
            {' '}sebagai proyek portofolio · {new Date().getFullYear()}
          </p>
          <div className="flex items-center gap-2">
            <a className="icon-btn sm" href={AUTHOR.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn Afdhal Anwar" title="LinkedIn"><Icon name="linkedin" size={16} /></a>
            <a className="icon-btn sm" href={AUTHOR.github} target="_blank" rel="noopener noreferrer" aria-label="Kode sumber di GitHub" title="Kode sumber di GitHub"><Icon name="github" size={16} /></a>
            <a href="#main" className="ml-2 no-underline hover:underline">Kembali ke atas ↑</a>
          </div>
        </div>
      </footer>
    </>
  );
}

function FloatCard({ className, icon, tone, label, value }: { className: string; icon: IconName; tone: string; label: string; value: string }) {
  return (
    <div className={`card bob absolute flex items-center gap-3 rounded-2xl! py-3 pr-4 pl-3 shadow-float! ${className}`}>
      <span className={`tone tone-${tone} size-[38px] rounded-xl`}><Icon name={icon} /></span>
      <div>
        <p className="text-xs font-semibold text-muted">{label}</p>
        <p className="text-[14.5px] font-bold">{value}</p>
      </div>
    </div>
  );
}
