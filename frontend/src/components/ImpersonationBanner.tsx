"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Eye, LogOut, Loader2 } from "lucide-react";
import { useFeatures } from "@/contexts/FeaturesContext";
import { formatErr } from "@/lib/errors";

/**
 * Aparece no topo do dashboard quando o admin_master esta "vendo como" um
 * cliente (impersonation). Permite voltar pra /admin com um clique.
 */
export default function ImpersonationBanner() {
  const router = useRouter();
  const { me, reload } = useFeatures();
  const [voltando, setVoltando] = useState(false);

  if (!me?.impersonating) return null;

  const handleVoltar = async () => {
    setVoltando(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await axios.post(
        "/api-backend/admin/impersonate/stop",
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      localStorage.setItem("token", res.data.access_token);
      await reload();
      router.push("/admin");
    } catch (err: any) {
      alert(formatErr(err, "Erro ao voltar pro painel."));
      setVoltando(false);
    }
  };

  return (
    <div className="sticky top-0 z-40 w-full bg-amber-500/10 border-b border-amber-500/30 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-2.5 min-w-0">
          <Eye className="w-4 h-4 text-amber-300 shrink-0" strokeWidth={1.75} />
          <p className="text-xs text-amber-100 truncate">
            Você está vendo como{" "}
            <span className="font-semibold text-amber-50">
              {me.empresa_nome || `empresa #${me.empresa_id}`}
            </span>
            . Está navegando no sistema do cliente, não no seu painel admin.
          </p>
        </div>
        <button
          onClick={handleVoltar}
          disabled={voltando}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-50 transition-colors disabled:opacity-50"
        >
          {voltando ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <LogOut className="w-3.5 h-3.5" />
              Voltar pro painel
            </>
          )}
        </button>
      </div>
    </div>
  );
}
