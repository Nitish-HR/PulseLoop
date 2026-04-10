"use client";

import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MagicRings from "@/components/MagicRings";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("DONOR");
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

  const ringColorOne = errorTheme ? '#ef4444' : '#22c55e'; // Green
  const ringColorTwo = errorTheme ? '#b91c1c' : '#4ade80';

  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role,
        createdAt: new Date().toISOString()
      });

      router.push("/login");
    } catch (err: any) {
      setError(err.message || "Failed to create an account.");
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
          <h1 className="text-3xl font-bold mb-6 text-center text-white">Create an Account</h1>
          
          {error && (
             <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-200 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-green-100/70 mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 text-white transition-all shadow-inner"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-green-100/70 mb-1">Password</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 text-white transition-all shadow-inner"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-green-100/70 mb-1">Role</label>
              <select
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 text-white transition-all shadow-inner [&>option]:bg-gray-900 [&>option]:text-white"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="DONOR">Donor</option>
                <option value="HOSPITAL">Hospital</option>
                <option value="BLOOD_BANK">Blood Bank</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 px-4 bg-green-600 hover:bg-green-500 hover:shadow-[0_0_20px_rgba(22,163,74,0.4)] text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing up..." : "Sign Up"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-green-100/50">
            Already have an account?{" "}
            <Link href="/login" className="text-green-400 hover:text-green-300 font-medium hover:underline transition-colors">
              Login
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
