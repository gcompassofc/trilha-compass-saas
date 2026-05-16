import { auth } from '../firebase/config';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { motion } from 'motion/react';
import { toast } from './Toast';

export default function Login() {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
      const code = (error as { code?: string })?.code;
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return;
      toast.error('Falha ao entrar', error instanceof Error ? error.message : undefined);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen plasma-bg text-white p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="gc-card flex flex-col items-center max-w-md w-full text-center"
        style={{ padding: '48px' }}
      >
        <div className="mb-8">
          <img src="/logo-icon.png" alt="GCompass Icon" className="w-24 h-24 object-contain" />
        </div>

        <h1 className="gc-heading mb-4">Área Restrita</h1>
        <p className="gc-subheading mb-10 text-base">
          Esta plataforma é de uso exclusivo da equipe Compass. Por favor, identifique-se para continuar.
        </p>

        <button
          onClick={handleLogin}
          className="gc-button w-full justify-center py-4"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
          Entrar com Google
        </button>
      </motion.div>

      <p className="mt-8 text-white/30 text-sm">
        GCompass &copy; 2026 - Gestão de Operações
      </p>
    </div>
  );
}
