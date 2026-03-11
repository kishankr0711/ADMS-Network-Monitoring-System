
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isAuth = typeof window !== "undefined" ? localStorage.getItem("auth") : null;
    if (isAuth === "true") {
      router.replace("/");
    }
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (email !== "admin@gmail.com" || password !== "admin123") {
      setError("Invalid credentials. Use admin@gmail.com / admin123.");
      setLoading(false);
      return;
    }

    localStorage.setItem("auth", "true");
    if (remember) {
      localStorage.setItem("user", email);
    } else {
      localStorage.removeItem("user");
    }

    router.replace("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="absolute inset-0 bg-linear-to-br from-slate-900 via-slate-950 to-slate-900 opacity-90" />

      <div className="relative z-10 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl">
        
        {/* Left panel — black ADMS logo */}
        <div className="hidden md:flex flex-col items-center justify-center bg-slate-950 border-r border-slate-800 py-12 px-8">
          <div className="w-20 h-20 rounded-2xl bg-black border border-slate-700 flex items-center justify-center shadow-lg mb-4">
            <span className="text-xl font-bold text-white tracking-widest">ADMS</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-1">ADMS</h2>
          <p className="text-slate-400 text-sm text-center max-w-xs">
            Advanced Distribution Management System
          </p>
        </div>

        {/* Right panel — login form */}
        <div className="flex flex-col justify-center px-8 py-10 bg-slate-900/90">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 text-center md:text-left">
            Sign in to ADMS
          </h1>
          <p className="text-slate-400 text-sm mb-6 text-center md:text-left">
            Use <span className="font-mono text-slate-200">admin@gmail.com / admin123</span> for login.
          </p>

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Email / Username</label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-500"
                />
                <span>Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-linear-to-r from-blue-500 to-indigo-500 py-2.5 text-sm font-semibold text-white shadow-md hover:from-blue-600 hover:to-indigo-600 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}