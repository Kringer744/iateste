"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import axios from "axios";
import { DEFAULT_FEATURES, hasFeature, inferPreset, FeatureKey } from "@/lib/features";

type MeResponse = {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  empresa_id: number;
  features?: string[];
};

type FeaturesContextValue = {
  me: MeResponse | null;
  features: string[];
  preset: string;
  ready: boolean;
  has: (key: FeatureKey | string) => boolean;
  reload: () => Promise<void>;
};

const FeaturesContext = createContext<FeaturesContextValue | null>(null);

export function FeaturesProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [ready, setReady] = useState(false);

  const fetchMe = async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) {
      setReady(true);
      return;
    }
    try {
      const res = await axios.get<MeResponse>("/api-backend/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMe(res.data);
    } catch {
      setMe(null);
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    fetchMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<FeaturesContextValue>(() => {
    const features =
      me?.features && me.features.length > 0
        ? me.features
        : [...DEFAULT_FEATURES];
    return {
      me,
      features,
      preset: inferPreset(features),
      ready,
      has: (key) => hasFeature(features, key),
      reload: fetchMe,
    };
  }, [me, ready]);

  return (
    <FeaturesContext.Provider value={value}>{children}</FeaturesContext.Provider>
  );
}

export function useFeatures(): FeaturesContextValue {
  const ctx = useContext(FeaturesContext);
  if (!ctx) {
    // Fallback seguro caso algum componente seja montado fora do provider.
    // Evita crash durante transicao — assume defaults de barbearia.
    const features = [...DEFAULT_FEATURES];
    return {
      me: null,
      features,
      preset: "barbearia",
      ready: true,
      has: (key) => hasFeature(features, key),
      reload: async () => {},
    };
  }
  return ctx;
}

export function useHasFeature(key: FeatureKey | string): boolean {
  const { has } = useFeatures();
  return has(key);
}
