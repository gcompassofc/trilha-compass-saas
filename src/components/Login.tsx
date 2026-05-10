import { auth } from '../firebase/config';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';

export default function Login() {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen plasma-bg text-white p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass p-12 rounded-3xl border border-white/10 flex flex-col items-center max-w-md w-full text-center"
      >
        <div className="mb-8">
          <img src="/logo-icon.png" alt="GCompass Icon" className="w-24 h-24 object-contain" />
        </div>

        
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
          Área Restrita
        </h1>
        <p className="text-white/60 mb-10 text-lg">
          Esta plataforma é de uso exclusivo da equipe Compass. Por favor, identifique-se para continuar.
        </p>

        <button 
          onClick={handleLogin}
          className="w-full py-4 px-6 bg-white text-indigo-950 font-bold rounded-xl hover:bg-white/90 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/10"
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
