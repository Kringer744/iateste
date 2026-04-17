"use client";
export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    fetch("/api-backend/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error("auth");
        const me = await r.json();
        if (me.perfil === "admin_master") {
          router.push("/admin");
          return;
        }
        const segmento = me.segmento || "barbearia";
        router.push(segmento === "hotel" ? "/hotel" : "/dashboard");
      })
      .catch(() => {
        localStorage.removeItem("token");
        router.push("/login");
      });
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-mesh">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <p className="text-gray-400 animate-pulse">Carregando Closer IA...</p>
      </div>
    </div>
  );
}
