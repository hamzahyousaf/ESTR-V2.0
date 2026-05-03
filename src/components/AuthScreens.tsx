import { motion } from 'motion/react';
import { LogIn, ShieldAlert } from 'lucide-react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';

export function Login() {
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Login failed:", error);
      if (error.code === 'auth/unauthorized-domain') {
        alert("This domain is not authorized for Firebase Authentication. Please add it in the Firebase Console.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no need to alert
      } else {
        alert("Login failed: " + error.message);
      }
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-bento-bg p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-bento-card border border-bento-border p-8 rounded-2xl max-w-md w-full text-center space-y-6 shadow-2xl"
      >
        <div className="flex justify-center">
          <div className="p-4 bg-bento-gold/10 rounded-full">
            <ShieldAlert className="w-12 h-12 text-bento-gold" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white mb-2">ESTR V2.0 Pro</h1>
          <p className="text-bento-muted text-sm leading-relaxed">
            Advanced real-time crypto trading scanner featuring SMC/ICT modes with high-confluence scoring.
          </p>
        </div>
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white text-black py-3 rounded-xl font-bold hover:bg-slate-200 transition-all uppercase tracking-tight"
        >
          <LogIn className="w-5 h-5" />
          Login with Google
        </button>
      </motion.div>
    </div>
  );
}

export function AccessDenied({ email }: { email: string | null }) {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-bento-bg p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-bento-card border border-bento-border p-8 rounded-2xl max-w-md w-full text-center space-y-6 shadow-2xl"
      >
        <div className="flex justify-center">
          <div className="p-4 bg-bento-red/10 rounded-full text-bento-red">
            <ShieldAlert className="w-12 h-12" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white mb-2">Access Denied</h1>
          <p className="text-bento-muted text-sm leading-relaxed">
            Sorry, your email <span className="text-white font-bold">{email}</span> is not whitelisted.
          </p>
          <p className="mt-4 text-xs text-bento-muted">
            Please contact the administrator at <span className="text-bento-gold">hamzahyousaf@gmail.com</span> to request access.
          </p>
        </div>
        <button
          onClick={() => auth.signOut()}
          className="w-full border border-bento-border py-3 rounded-xl font-bold hover:bg-white/5 transition-all uppercase tracking-tight text-white"
        >
          Logout
        </button>
      </motion.div>
    </div>
  );
}
