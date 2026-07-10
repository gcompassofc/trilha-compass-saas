import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

/** Tela de login (Google) — mesmo provedor/projeto do app antigo. */
export default function Login() {
  async function handleLogin() {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      console.error('Login falhou', error);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-4 text-center">
      <div className="w-full max-w-sm rounded-3xl bg-white/70 p-10 card-shadow">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
          <span className="h-6 w-6 rounded-lg bg-white" />
        </div>
        <h1 className="text-[22px] font-extrabold text-ink">Fluxo</h1>
        <p className="mt-1 text-[13px] text-ink-faint">Demandas de marketing · área restrita da equipe</p>

        <button
          onClick={handleLogin}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3.5 text-[14px] font-semibold text-white transition hover:bg-accent-strong"
        >
          <img src="https://www.google.com/favicon.ico" alt="" className="h-4 w-4" />
          Entrar com Google
        </button>
      </div>
      <p className="mt-8 text-[12px] text-ink-faint">GCompass © 2026</p>
    </div>
  );
}
