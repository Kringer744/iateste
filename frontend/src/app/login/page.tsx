"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Mail, ArrowRight, Loader2, Sparkles } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("username", email);
      formData.append("password", password);

      const response = await axios.post(`/api-backend/auth/login`, formData);
      const { access_token } = response.data;

      localStorage.setItem("token", access_token);

      const meRes = await axios.get("/api-backend/auth/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (meRes.data.perfil === "admin_master") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error(err);
      setError("E-mail ou senha incorretos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[#0A0A0A]">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-[420px]"
      >
        {/* Logo / brand */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-11 h-11 rounded-xl bg-[#141414] border border-white/[0.06] flex items-center justify-center mb-5">
            <Sparkles className="w-5 h-5 text-white" strokeWidth={1.75} />
          </div>
          <h1 className="text-[28px] font-semibold text-white tracking-tight mb-1.5">
            Bem-vindo de volta
          </h1>
          <p className="text-sm text-zinc-500 tracking-tight">
            Entre na sua conta Closer IA
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#141414] border border-white/[0.06] rounded-2xl p-7">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 tracking-tight">
                E-mail
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
                  strokeWidth={1.75}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-[#1A1A1A] border border-white/[0.06] rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-400 tracking-tight">
                Senha
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
                  strokeWidth={1.75}
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#1A1A1A] border border-white/[0.06] rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/20 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 px-3.5 py-2.5 bg-[#1A1A1A] border border-white/[0.08] rounded-lg"
              >
                <div className="w-1 h-1 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                <p className="text-xs text-zinc-300 leading-relaxed">{error}</p>
              </motion.div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white hover:bg-zinc-100 text-black font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group text-sm tracking-tight"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} />
              ) : (
                <>
                  Acessar painel
                  <ArrowRight
                    className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                    strokeWidth={2}
                  />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-zinc-600 mt-7 tracking-tight">
          Plataforma de agendamento inteligente com IA
        </p>
      </motion.div>
    </div>
  );
}
