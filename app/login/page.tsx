"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MagicRings from "@/components/MagicRings";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // React Bits Rings state handling
  const [errorTheme, setErrorTheme] = useState(false);

  useEffect(() => {
    if (error) {
      setErrorTheme(true);
      const timer = setTimeout(() => setErrorTheme(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const ringColorOne = errorTheme ? '#ef4444' : '#3b82f6';
  const ringColorTwo = errorTheme ? '#b91c1c' : '#60a5fa';
  
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role;
        
        if (role === "DONOR") router.push("/donor/dashboard");
        else if (role === "HOSPITAL") router.push("/hospital/dashboard");
        else if (role === "BLOOD_BANK") router.push("/bloodbank/dashboard");
        else {
          setError("Invalid user role assigned.");
        }
      } else {
        setError("User role document not found.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* React Bits WebGL Magic Rings Background */}
      <div className="fixed inset-0 overflow-hidden -z-10 bg-[#030712]">
        <div className="absolute inset-0 w-full h-full">
          <MagicRings 
            color={ringColorOne}
            colorTwo={ringColorTwo}
            followMouse={true}
            clickBurst={true}
            ringCount={8}
            scaleRate={0.15}
            speed={1.5}
            mouseInfluence={0.05}
            opacity={0.8}
            parallax={0.03}
          />
        </div>
      </div>

      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 z-10 relative">
          <h1 className="text-3xl font-bold mb-6 text-center text-white">Login</h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-100/70 mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-white transition-all shadow-inner"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-100/70 mb-1">Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 text-white transition-all shadow-inner"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 px-4 bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Authenticating..." : "Log In"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-blue-100/50">
            Don't have an account?{" "}
            <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
