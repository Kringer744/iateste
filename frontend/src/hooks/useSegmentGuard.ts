"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type Segmento = "barbearia" | "hotel";

export interface Me {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  empresa_id: number;
  segmento: Segmento;
  empresa_nome?: string | null;
}

/**
 * Guarda uma árvore de rotas por segmento. Se o usuário logado não
 * pertencer ao `expected`, redireciona para a sua árvore correta.
 * Retorna { me, ready } — o conteúdo da página só deve renderizar
 * quando `ready === true` para evitar flash da UI errada.
 */
export function useSegmentGuard(expected: Segmento) {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      router.replace("/login");
      return;
    }

    fetch("/api-backend/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error("auth");
        return (await r.json()) as Me;
      })
      .then((data) => {
        if (cancelled) return;
        // admin_master passa por qualquer segmento
        if (data.perfil === "admin_master") {
          setMe(data);
          setReady(true);
          return;
        }
        const seg = (data.segmento || "barbearia") as Segmento;
        if (seg !== expected) {
          const target = seg === "hotel" ? "/hotel" : "/dashboard";
          router.replace(target);
          return;
        }
        setMe(data);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem("token");
          router.replace("/login");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [expected, router]);

  return { me, ready };
}
