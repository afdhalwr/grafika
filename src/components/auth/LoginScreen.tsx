'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Brand, FullPageSpinner } from '@/components/Brand';
import { Icon, type IconName } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { SetupNotice } from '@/components/SetupNotice';
import { ThemeToggle } from '@/components/theme';
import { useToast } from '@/components/Toast';
import { AuthError, DEMO, lockedSeconds, login, loginDemo, logout, register, resetPassword } from '@/lib/auth';
import { firstName } from '@/lib/format';
import { AuthArt } from './AuthArt';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

type Tab = 'login' | 'register';
const TAB_COPY: Record<Tab, { title: string; sub: string; doc: string }> = {
  login: { title: 'Selamat datang kembali', sub: 'Masuk untuk melihat statistik terbarumu.', doc: 'Masuk — Grafika' },
  register: { title: 'Buat akun baru', sub: 'Gratis, dan sudah berisi contoh data untuk dijelajahi.', doc: 'Daftar — Grafika' },
};

const STRENGTH = ['Kekuatan kata sandi', 'Lemah', 'Cukup', 'Baik', 'Kuat'];

type Fields = { loginEmail: string; loginPassword: string; regName: string; regEmail: string; regPassword: string; regConfirm: string };
type FieldId = keyof Fields;

const validators: Record<FieldId, (v: string, all: Fields) => string> = {
  loginEmail: v => (!v ? 'Email wajib diisi.' : !EMAIL_RE.test(v) ? 'Format email belum benar.' : ''),
  loginPassword: v => (!v ? 'Kata sandi wajib diisi.' : ''),
  regName: v => (!v.trim() ? 'Nama wajib diisi.' : v.trim().length < 2 ? 'Nama minimal 2 huruf.' : ''),
  regEmail: v => (!v ? 'Email wajib diisi.' : !EMAIL_RE.test(v) ? 'Format email belum benar.' : ''),
  regPassword: v => (!v ? 'Kata sandi wajib diisi.' : v.length < 8 ? 'Minimal 8 karakter.' : ''),
  regConfirm: (v, all) => (!v ? 'Ulangi kata sandimu.' : v !== all.regPassword ? 'Kata sandi tidak sama.' : ''),
};

export function LoginScreen() {
  const { user, configured } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const wantsDemo = params.has('demo');

  const [tab, setTab] = useState<Tab>('login');
  const [fields, setFields] = useState<Fields>({ loginEmail: '', loginPassword: '', regName: '', regEmail: '', regPassword: '', regConfirm: '' });
  const [errors, setErrors] = useState<Partial<Record<FieldId, string>>>({});
  const [alert, setAlert] = useState<{ tab: Tab; msg: string; ok?: boolean } | null>(null);
  const [remember, setRemember] = useState(true);
  const [terms, setTerms] = useState(false);
  const [termsErr, setTermsErr] = useState('');
  const [busy, setBusy] = useState<string | null>(null); // label tombol saat memproses
  const [lockLeft, setLockLeft] = useState(0);
  const [success, setSuccess] = useState(false);
  const [demoTyping, setDemoTyping] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  const inputs = useRef<Partial<Record<FieldId, HTMLInputElement | null>>>({});
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ login: null, register: null });
  const cardRef = useRef<HTMLDivElement>(null);
  const navigating = useRef(false);
  const demoStarted = useRef(false);

  /* ---------- sudah masuk? langsung ke dasbor ---------- */
  useEffect(() => {
    if (user && !wantsDemo && !navigating.current) router.replace('/dashboard');
  }, [user, wantsDemo, router]);

  /* ---------- tab dari hash (#daftar) ---------- */
  useEffect(() => {
    if (location.hash === '#daftar') setTab('register');
  }, []);
  useEffect(() => {
    document.title = TAB_COPY[tab].doc;
  }, [tab]);

  const showTab = useCallback((next: Tab, focus = false) => {
    setTab(next);
    history.replaceState(null, '', next === 'register' ? '#daftar' : location.pathname + location.search);
    if (focus) setTimeout(() => inputs.current[next === 'login' ? 'loginEmail' : 'regName']?.focus(), 0);
  }, []);

  /* ---------- hitung mundur saat terkunci ---------- */
  useEffect(() => {
    if (lockLeft <= 0) return;
    const id = setTimeout(() => {
      setLockLeft(s => s - 1);
      if (lockLeft === 1) setAlert(null);
    }, 1000);
    return () => clearTimeout(id);
  }, [lockLeft]);

  /* ---------- validasi ---------- */
  const validate = (id: FieldId, all = fields) => {
    const msg = validators[id](all[id], all);
    setErrors(e => ({ ...e, [id]: msg }));
    return !msg;
  };
  const setField = (id: FieldId, value: string) => {
    const next = { ...fields, [id]: value };
    setFields(next);
    if (errors[id]) validate(id, next); // setelah salah, validasi ulang saat mengetik
    if (id === 'regPassword' && next.regConfirm) validate('regConfirm', next);
  };
  const shake = () => {
    const el = cardRef.current;
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth; // mulai ulang animasi
    el.classList.add('shake');
  };
  const focusFirstInvalid = (ids: FieldId[], all = fields) => {
    const bad = ids.find(id => validators[id](all[id], all));
    if (bad) inputs.current[bad]?.focus();
  };

  const goToDashboard = (name: string) => {
    navigating.current = true;
    setSuccess(true);
    setBusy('Mengalihkan…');
    toast(`Berhasil masuk. Halo, ${firstName(name)}!`);
    setTimeout(() => router.push('/dashboard'), 650);
  };

  /* ---------- masuk ---------- */
  async function submitLogin(e?: FormEvent, values = fields) {
    e?.preventDefault();
    const ids: FieldId[] = ['loginEmail', 'loginPassword'];
    const ok = ids.map(id => validate(id, values)).every(Boolean);
    if (!ok) { shake(); focusFirstInvalid(ids, values); return; }

    setAlert(null);
    setBusy('Memeriksa…');
    navigating.current = true; // jangan biarkan pengalihan otomatis memotong animasi sukses
    try {
      const isDemo = values.loginEmail.trim().toLowerCase() === DEMO.email && values.loginPassword === DEMO.password;
      const [res] = await Promise.all([
        isDemo ? loginDemo() : login({ email: values.loginEmail, password: values.loginPassword, remember }),
        wait(450), // jeda kecil supaya status terasa
      ]);
      goToDashboard(res.name);
    } catch (err) {
      navigating.current = false;
      const ae = err instanceof AuthError ? err : new AuthError('Terjadi kesalahan. Coba lagi.');
      setAlert({ tab: 'login', msg: ae.message });
      shake();
      inputs.current.loginPassword?.select();
      setBusy(null);
      if (ae.lockedFor) setLockLeft(ae.lockedFor);
    }
  }

  /* ---------- daftar ---------- */
  async function submitRegister(e: FormEvent) {
    e.preventDefault();
    const ids: FieldId[] = ['regName', 'regEmail', 'regPassword', 'regConfirm'];
    let ok = ids.map(id => validate(id)).every(Boolean);
    setTermsErr(terms ? '' : 'Centang dulu untuk melanjutkan.');
    ok = ok && terms;
    if (!ok) {
      shake();
      if (ids.some(id => validators[id](fields[id], fields))) focusFirstInvalid(ids);
      else document.getElementById('regTerms')?.focus();
      return;
    }
    setAlert(null);
    setBusy('Membuat akun…');
    navigating.current = true;
    try {
      const res = await register({ name: fields.regName, email: fields.regEmail, password: fields.regPassword });
      goToDashboard(res.name);
    } catch (err) {
      navigating.current = false;
      setAlert({ tab: 'register', msg: err instanceof Error ? err.message : 'Gagal membuat akun.' });
      shake();
      setBusy(null);
    }
  }

  /* ---------- akun demo: isi otomatis seperti diketik ---------- */
  const runDemo = useCallback(async () => {
    setTab('login');
    setDemoTyping(true);
    const typed = { ...fields, loginEmail: '', loginPassword: '' };
    for (const [id, text] of [['loginEmail', DEMO.email], ['loginPassword', DEMO.password]] as const) {
      inputs.current[id]?.focus();
      for (const ch of text) {
        typed[id] += ch;
        setFields({ ...typed });
        await wait(28);
      }
    }
    setDemoTyping(false);
    await submitLogin(undefined, typed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  useEffect(() => {
    if (!wantsDemo || user === undefined || demoStarted.current) return;
    demoStarted.current = true;
    (async () => {
      if (user) await logout();
      await wait(400);
      runDemo();
    })();
  }, [wantsDemo, user, runDemo]);

  /* ---------- tampilan ---------- */
  if (!configured) return <SetupNotice />;
  if (user === undefined || (user && !wantsDemo && !navigating.current)) return <FullPageSpinner />;

  const loginBusy = !!busy && tab === 'login';
  const regBusy = !!busy && tab === 'register';
  const pw = fields.regPassword;
  const rules = { len: pw.length >= 8, case: /[a-z]/.test(pw) && /[A-Z]/.test(pw), num: /\d/.test(pw), sym: /[^A-Za-z0-9]/.test(pw) };
  const score = pw ? Math.max(1, Object.values(rules).filter(Boolean).length) : 0;

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const next = tab === 'login' ? 'register' : 'login';
    showTab(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="grid min-h-dvh grid-cols-[minmax(420px,1fr)_minmax(0,1.1fr)] max-lg:grid-cols-1">
      <AuthArt />

      <main className="flex flex-col items-center p-6 max-lg:bg-[radial-gradient(circle_at_100%_0%,var(--primary-soft),transparent_45%),radial-gradient(circle_at_0%_100%,var(--pink-soft),transparent_40%)] max-xs:p-4">
        <div className="flex w-full max-w-[520px] items-center justify-between">
          <Link className="inline-flex items-center gap-1 rounded-[10px] py-2 pr-2.5 pl-1 text-sm font-semibold text-fg-2 no-underline hover:text-primary" href="/">
            <Icon name="chevron-left" /> Beranda
          </Link>
          <Brand className="lg:hidden" />
          <ThemeToggle />
        </div>

        <div ref={cardRef} className="m-auto w-full max-w-[440px] py-8 max-xs:py-5">
          <div>
            <h1 className="text-[30px] font-extrabold max-xs:text-[25px]">{TAB_COPY[tab].title}</h1>
            <p className="mt-2 text-fg-2">{TAB_COPY[tab].sub}</p>
          </div>

          <div className="relative mt-[26px] mb-6 grid grid-cols-2 rounded-[14px] bg-surface-2 p-[5px]" role="tablist" aria-label="Pilih masuk atau daftar" onKeyDown={onTabKey}>
            <span aria-hidden className={`absolute top-[5px] bottom-[5px] left-[5px] w-[calc(50%-5px)] rounded-[10px] bg-surface shadow-soft transition-transform duration-300 ${tab === 'register' ? 'translate-x-full' : ''}`} />
            {(['login', 'register'] as const).map(t => (
              <button
                key={t}
                ref={el => { tabRefs.current[t] = el; }}
                role="tab"
                id={`tab-${t}`}
                aria-controls={`panel-${t}`}
                aria-selected={tab === t}
                tabIndex={tab === t ? 0 : -1}
                onClick={() => showTab(t, true)}
                className={`relative z-[1] h-10 rounded-[10px] font-bold transition-colors ${tab === t ? 'text-fg' : 'text-muted'}`}
              >
                {t === 'login' ? 'Masuk' : 'Daftar'}
              </button>
            ))}
          </div>

          {/* ---------- MASUK ---------- */}
          {tab === 'login' && (
            <form id="panel-login" role="tabpanel" aria-labelledby="tab-login" noValidate onSubmit={submitLogin} className={`anim-in ${success ? 'pointer-events-none opacity-60 transition-opacity' : ''}`}>
              {alert?.tab === 'login' && <Alert msg={alert.msg} />}

              <FloatField id="loginEmail" icon="mail" label="Email" type="email" autoComplete="email" value={fields.loginEmail} error={errors.loginEmail}
                inputRef={el => { inputs.current.loginEmail = el; }} onChange={v => setField('loginEmail', v)}
                onBlur={() => {
                  if (fields.loginEmail) validate('loginEmail');
                  const s = lockedSeconds(fields.loginEmail); // pulihkan hitung mundur setelah muat ulang
                  if (s) setLockLeft(s);
                }} />
              <PasswordField id="loginPassword" label="Kata sandi" autoComplete="current-password" value={fields.loginPassword} error={errors.loginPassword}
                inputRef={el => { inputs.current.loginPassword = el; }} onChange={v => setField('loginPassword', v)}
                onBlur={() => fields.loginPassword && validate('loginPassword')} />

              <div className="mt-1 mb-[22px] flex items-center justify-between gap-3 text-sm">
                <label className="check">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
                  <span className="check-box"><Icon name="check" /></span>
                  Ingat saya 30 hari
                </label>
                <button className="link-btn font-semibold" type="button" onClick={() => setForgotOpen(true)}>Lupa kata sandi?</button>
              </div>

              <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={loginBusy || lockLeft > 0 || demoTyping}>
                {loginBusy && <span className="spinner" aria-hidden />}
                {lockLeft > 0 ? `Coba lagi dalam ${lockLeft} dtk` : busy && tab === 'login' ? busy : 'Masuk'}
              </button>

              <div className="my-5 flex items-center gap-3.5 text-[13px] text-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">atau</div>

              <button className="btn btn-outline btn-lg btn-block" type="button" onClick={runDemo} disabled={demoTyping || loginBusy}>
                <span className="text-lemon"><Icon name="zap" /></span> Masuk dengan akun demo
              </button>
              <p className="mt-2.5 text-center text-[12.5px] text-muted">{DEMO.email} · {DEMO.password}</p>
            </form>
          )}

          {/* ---------- DAFTAR ---------- */}
          {tab === 'register' && (
            <form id="panel-register" role="tabpanel" aria-labelledby="tab-register" noValidate onSubmit={submitRegister} className={`anim-in ${success ? 'pointer-events-none opacity-60 transition-opacity' : ''}`}>
              {alert?.tab === 'register' && <Alert msg={alert.msg} />}

              <FloatField id="regName" icon="user" label="Nama panggilan" autoComplete="name" maxLength={40} value={fields.regName} error={errors.regName}
                inputRef={el => { inputs.current.regName = el; }} onChange={v => setField('regName', v)} onBlur={() => fields.regName && validate('regName')} />
              <FloatField id="regEmail" icon="mail" label="Email" type="email" autoComplete="email" value={fields.regEmail} error={errors.regEmail}
                inputRef={el => { inputs.current.regEmail = el; }} onChange={v => setField('regEmail', v)} onBlur={() => fields.regEmail && validate('regEmail')} />
              <PasswordField id="regPassword" label="Kata sandi" autoComplete="new-password" value={fields.regPassword} error={errors.regPassword}
                inputRef={el => { inputs.current.regPassword = el; }} onChange={v => setField('regPassword', v)} onBlur={() => fields.regPassword && validate('regPassword')}
                describedBy="regStrength" />

              <div className="-mt-1 mb-[18px]" id="regStrength" aria-live="polite">
                <div className="strength-bar" data-score={score}><span /><span /><span /><span /></div>
                <span className="mt-2 block text-[12.5px] font-bold text-muted">{STRENGTH[score]}</span>
                <ul className="strength-rules mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[12.5px] text-muted max-xs:grid-cols-1">
                  <li className={rules.len ? 'ok' : ''}>Minimal 8 karakter</li>
                  <li className={rules.case ? 'ok' : ''}>Huruf besar &amp; kecil</li>
                  <li className={rules.num ? 'ok' : ''}>Mengandung angka</li>
                  <li className={rules.sym ? 'ok' : ''}>Mengandung simbol</li>
                </ul>
              </div>

              <FloatField id="regConfirm" icon="check" label="Ulangi kata sandi" type="password" autoComplete="new-password" value={fields.regConfirm} error={errors.regConfirm}
                inputRef={el => { inputs.current.regConfirm = el; }} onChange={v => setField('regConfirm', v)} onBlur={() => fields.regConfirm && validate('regConfirm')} />

              <label className="check mt-1 items-start!">
                <input type="checkbox" id="regTerms" checked={terms} onChange={e => { setTerms(e.target.checked); if (e.target.checked) setTermsErr(''); }} />
                <span className="check-box mt-px"><Icon name="check" /></span>
                <span>Aku setuju dataku disimpan dengan aman di akun Grafika-ku.</span>
              </label>
              <p className="field-error mb-3.5">{termsErr}</p>

              <button className="btn btn-primary btn-lg btn-block mt-3.5" type="submit" disabled={regBusy}>
                {regBusy && <span className="spinner" aria-hidden />}
                {regBusy ? busy : 'Buat akun'}
              </button>
            </form>
          )}
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-[12.5px] text-muted">
          <Icon name="lock" size={13} /> Koneksi terenkripsi · datamu hanya bisa diakses olehmu
        </p>
      </main>

      <ForgotModal open={forgotOpen} onClose={() => setForgotOpen(false)} initialEmail={fields.loginEmail}
        onRegister={() => { setForgotOpen(false); showTab('register', true); }} />
    </div>
  );
}

/* ---------- komponen kecil ---------- */

function Alert({ msg, ok = false }: { msg: string; ok?: boolean }) {
  return (
    <div role="alert" className={`mb-4 flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm font-semibold ${ok ? 'bg-good-soft text-good' : 'bg-bad-soft text-bad'}`}>
      <Icon name={ok ? 'check' : 'alert'} /> <span>{msg}</span>
    </div>
  );
}

type FieldProps = {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  inputRef?: (el: HTMLInputElement | null) => void;
  autoComplete?: string;
  maxLength?: number;
  describedBy?: string;
};

function FloatField({ icon, type = 'text', children, ...p }: FieldProps & { icon: IconName; type?: string; children?: React.ReactNode }) {
  return (
    <div className="float-field">
      <span className="ff-icon"><Icon name={icon} /></span>
      <input
        ref={p.inputRef}
        className="ff-input"
        id={p.id}
        name={p.id}
        type={type}
        autoComplete={p.autoComplete}
        maxLength={p.maxLength}
        placeholder=" "
        value={p.value}
        onChange={e => p.onChange(e.target.value)}
        onBlur={p.onBlur}
        aria-invalid={p.error ? true : undefined}
        aria-describedby={[`${p.id}Err`, p.describedBy].filter(Boolean).join(' ')}
      />
      <label htmlFor={p.id}>{p.label}</label>
      {children}
      <p className="field-error" id={`${p.id}Err`}>{p.error}</p>
    </div>
  );
}

function PasswordField(p: FieldProps) {
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const local = useRef<HTMLInputElement | null>(null);
  const check = (e: React.KeyboardEvent) => setCaps(e.getModifierState?.('CapsLock') ?? false);

  return (
    <div className="float-field" onKeyDown={check} onKeyUp={check}>
      <span className="ff-icon"><Icon name="lock" /></span>
      <input
        ref={el => { local.current = el; p.inputRef?.(el); }}
        className="ff-input"
        id={p.id}
        name={p.id}
        type={show ? 'text' : 'password'}
        autoComplete={p.autoComplete}
        placeholder=" "
        value={p.value}
        onChange={e => p.onChange(e.target.value)}
        onBlur={() => { setCaps(false); p.onBlur?.(); }}
        aria-invalid={p.error ? true : undefined}
        aria-describedby={[`${p.id}Err`, `${p.id}Caps`, p.describedBy].filter(Boolean).join(' ')}
      />
      <label htmlFor={p.id}>{p.label}</label>
      <button className="ff-toggle" type="button" aria-label={show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
        onClick={() => { setShow(s => !s); local.current?.focus(); }}>
        <Icon name={show ? 'eye-off' : 'eye'} />
      </button>
      {caps && (
        <p id={`${p.id}Caps`} className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-lemon">
          <Icon name="alert" /> Caps Lock aktif
        </p>
      )}
      <p className="field-error" id={`${p.id}Err`}>{p.error}</p>
    </div>
  );
}

function ForgotModal({ open, onClose, initialEmail, onRegister }: { open: boolean; onClose: () => void; initialEmail: string; onRegister: () => void }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<{ busy?: boolean; err?: string; sent?: boolean }>({});

  useEffect(() => {
    if (open) { setEmail(initialEmail); setState({}); }
  }, [open, initialEmail]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(email)) { setState({ err: 'Masukkan email yang valid.' }); return; }
    if (email.trim().toLowerCase() === DEMO.email) { setState({ err: 'Kata sandi akun demo tidak bisa diatur ulang.' }); return; }
    setState({ busy: true });
    try {
      await resetPassword(email);
      setState({ sent: true });
    } catch (err) {
      setState({ err: err instanceof Error ? err.message : 'Gagal mengirim email.' });
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Lupa kata sandi?">
      <form onSubmit={send} noValidate>
        <div className="modal-body">
          {state.sent ? (
            <Alert ok msg={`Jika ${email} terdaftar, tautan untuk mengatur ulang kata sandi sudah dikirim. Cek juga folder spam.`} />
          ) : (
            <>
              <p className="mb-4 text-fg-2">Masukkan email akunmu. Kami akan mengirim tautan untuk membuat kata sandi baru.</p>
              <label className="label" htmlFor="forgotEmail">Email</label>
              <input className="input" id="forgotEmail" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} aria-invalid={state.err ? true : undefined} />
              <p className="field-error" role="alert">{state.err}</p>
              <p className="hint">Belum punya akun? <button type="button" className="link-btn p-0!" onClick={onRegister}>Buat akun baru</button></p>
            </>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-outline" type="button" onClick={onClose}>Tutup</button>
          {!state.sent && (
            <button className="btn btn-primary" type="submit" disabled={state.busy}>
              {state.busy && <span className="spinner" aria-hidden />} Kirim tautan
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
